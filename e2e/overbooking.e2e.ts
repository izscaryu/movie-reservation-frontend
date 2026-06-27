import fs from 'node:fs';
import path from 'node:path';
import { test, request, type Page, type Browser, type BrowserContext } from '@playwright/test';

/**
 * The two-tab overbooking demo capture — the headline artifact of the whole
 * project, from the CLIENT side. The backend guarantees one winner; the story
 * here is what the LOSER sees and how they recover.
 *
 * Two isolated browser contexts (two real users, demo-a vs demo-b), both land on
 * the same showtime and both pick the SAME seat (C7):
 *   - A holds C7 first        → 201 → /hold (PENDING ticket) → confirms → CONFIRMED
 *   - B holds C7 a beat later → 409 → C7 re-renders HELD + the vermilion ring +
 *                                "C7 was just taken. Pick again."
 *   - B recovers: re-picks C8 → 201 → /hold → confirms → CONFIRMED
 *
 * Deterministic by construction: because the client uses refresh-on-conflict (no
 * poll), B's map is stale until B clicks Hold, so B's 409 fires every run as long
 * as A holds first. No real timing race to lose.
 *
 * Output: a beat screenshot of EACH tab into e2e/output/frames + a manifest.json
 * (label + dwell per beat) that the Stage-D gif builder composes side-by-side.
 * Video is also recorded per context as a fallback. All output is gitignored;
 * only the final docs/overbooking-demo.gif is committed.
 *
 * Requires: dev server on 5173, backend on 8080, seeded users demo-a / demo-b,
 * and showtime 146 with C7/C8 free (a clean 40-seat room).
 */

const APP = 'http://localhost:5173';
const API = 'http://localhost:8080';
const REFRESH_TOKEN_KEY = 'mrs.refreshToken';

const USER_A = { email: 'demo-a@orpheum.test', password: 'Password123!' };
const USER_B = { email: 'demo-b@orpheum.test', password: 'Password123!' };
const ADMIN = { email: 'admin@example.com', password: 'admin123' };

// A fresh showtime is minted per run (admin API) so the room is always clean and
// the capture is re-runnable any number of times — confirming books seats, so a
// fixed showtime would be poisoned after the first take. movie 113 + room 1 (the
// 40-seat house) exist in the seed. The slot is a random readable 2037 date (so
// the ticket reads sensibly on camera) with retry-on-overlap, since there's no
// delete-showtime endpoint and prior runs leave showtimes behind.
const SHOWTIME = { movieId: 113, theaterRoomId: 1, price: 12.0 };

function randomSlot(): string {
  const mm = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
  const dd = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
  const hh = String(10 + Math.floor(Math.random() * 12)).padStart(2, '0'); // 10:00–21:00
  return `2037-${mm}-${dd}T${hh}:00`;
}

// A tall, narrow-ish viewport per tab so the whole seat map + status + action bar
// fit without scrolling; 2x scale keeps the dark-theme text crisp on camera.
const VIEWPORT = { width: 820, height: 960 };

const outDir = path.resolve('e2e/output');
const framesDir = path.join(outDir, 'frames');
const videoDir = path.join(outDir, 'video');

type Surface = 'seats' | 'hold';
type Frame = {
  index: number;
  label: string;
  a: string;
  b: string;
  dwellMs: number;
  aKind: Surface;
  bKind: Surface;
};

test('two-tab overbooking demo capture', async ({ browser }) => {
  test.setTimeout(180_000);

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  // ---- mint a fresh, clean showtime for this run ---------------------------
  const showtimeId = await createShowtime();

  // ---- auth both tabs out-of-band (no login footage) -----------------------
  // Log in via the API to mint a refresh token, then seed it into the context's
  // localStorage so the app silently restores the session on first load. Keeps
  // the capture focused on the seat flow, not the login form.
  const stateA = await authedStorageState(USER_A.email, USER_A.password);
  const stateB = await authedStorageState(USER_B.email, USER_B.password);

  const ctxA = await newTab(browser, stateA);
  const ctxB = await newTab(browser, stateB);
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  // ---- beat recorder -------------------------------------------------------
  const frames: Frame[] = [];
  let idx = 0;
  // Which surface each tab is showing this beat ('seats' grid vs 'hold' ticket) —
  // the gif builder crops the two surfaces differently (the ticket is short).
  const kindOf = (p: Page) => (p.url().includes('/hold/') ? 'hold' : 'seats');
  async function beat(label: string, dwellMs: number) {
    const i = String(idx).padStart(2, '0');
    const a = path.join(framesDir, `${i}-A.png`);
    const b = path.join(framesDir, `${i}-B.png`);
    await pageA.screenshot({ path: a });
    await pageB.screenshot({ path: b });
    frames.push({ index: idx, label, a, b, dwellMs, aKind: kindOf(pageA), bKind: kindOf(pageB) });
    idx++;
    // Hold so the recorded video also dwells on this state.
    await pageA.waitForTimeout(dwellMs);
  }

  // ---- both tabs land on the same showtime, authed -------------------------
  await Promise.all([gotoSeats(pageA, showtimeId), gotoSeats(pageB, showtimeId)]);
  await beat('Two patrons, one showtime — seat C7 open in both tabs', 2200);

  // ---- both pick the same seat ---------------------------------------------
  await Promise.all([pickSeat(pageA, 'C7'), pickSeat(pageB, 'C7')]);
  await beat('Both select C7', 2400);

  // ---- A wins the race: holds C7 -> PENDING ticket -------------------------
  await holdSelected(pageA);
  await expectHoldPending(pageA);
  await beat('Tab A holds C7 first — a pending ticket', 3500); // let the collision feel earned

  // ---- B loses: 409 -> C7 flips HELD + vermilion ring + copy ----------------
  // B's map was stale (no poll); the Hold click is the moment of truth.
  await holdSelected(pageB);
  await expectLostSeat(pageB, 'C7');
  await beat('Tab B clicks Hold a beat later — 409: C7 was just taken', 5500); // long: 3 things change at once

  // ---- B recovers: re-picks a free seat ------------------------------------
  await pickSeat(pageB, 'C8');
  await beat('Tab B recovers — re-picks the open C8', 3200); // the human half

  // ---- B holds C8 -> PENDING ticket ----------------------------------------
  await holdSelected(pageB);
  await expectHoldPending(pageB);
  await beat('Tab B holds C8 — back on track', 3000);

  // ---- both confirm: no seat double-booked, both patrons seated ------------
  await confirmHold(pageA);
  await confirmHold(pageB);
  await beat('Both confirmed — C7 to A, C8 to B, never double-booked', 4200); // resolution

  // ---- persist the manifest for the gif builder ----------------------------
  fs.writeFileSync(
    path.join(outDir, 'manifest.json'),
    JSON.stringify({ viewport: VIEWPORT, frames }, null, 2),
  );

  // Close contexts so the per-page videos flush to disk.
  await ctxA.close();
  await ctxB.close();

  const videoA = await pageA.video()?.path();
  const videoB = await pageB.video()?.path();
  console.log('\nCapture complete:', {
    frames: frames.length,
    framesDir,
    manifest: path.join(outDir, 'manifest.json'),
    videoA,
    videoB,
  });
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function createShowtime(): Promise<number> {
  const api = await request.newContext();
  const login = await api.post(`${API}/api/auth/login`, { data: ADMIN });
  if (!login.ok()) throw new Error(`admin login failed: ${login.status()}`);
  const { accessToken } = (await login.json()) as { accessToken: string };

  for (let attempt = 0; attempt < 12; attempt++) {
    const res = await api.post(`${API}/api/admin/showtimes`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { ...SHOWTIME, startTime: randomSlot() },
    });
    if (res.ok()) {
      const { id } = (await res.json()) as { id: number };
      await api.dispose();
      return id;
    }
    // 409 = slot overlaps a prior run's showtime → try another slot.
    if (res.status() !== 409) {
      throw new Error(`create showtime failed: ${res.status()} ${await res.text()}`);
    }
  }
  await api.dispose();
  throw new Error('could not find a free showtime slot after 12 attempts');
}

async function authedStorageState(email: string, password: string) {
  const api = await request.newContext();
  const res = await api.post(`${API}/api/auth/login`, { data: { email, password } });
  if (!res.ok()) throw new Error(`login failed for ${email}: ${res.status()} ${await res.text()}`);
  const { refreshToken } = (await res.json()) as { refreshToken: string };
  await api.dispose();
  return {
    cookies: [],
    origins: [
      { origin: APP, localStorage: [{ name: REFRESH_TOKEN_KEY, value: refreshToken }] },
    ],
  };
}

async function newTab(
  browser: Browser,
  storageState: Awaited<ReturnType<typeof authedStorageState>>,
): Promise<BrowserContext> {
  return browser.newContext({
    storageState,
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    recordVideo: { dir: videoDir, size: VIEWPORT },
  });
}

async function gotoSeats(page: Page, showtimeId: number) {
  await page.goto(`${APP}/showtimes/${showtimeId}/seats`);
  // Wait for the silent session restore (header swaps to authed) AND the map.
  await page.getByRole('button', { name: 'Log out' }).waitFor();
  await page.getByRole('button', { name: /^Seat A1,/ }).waitFor();
}

async function pickSeat(page: Page, label: string) {
  await page.getByRole('button', { name: new RegExp(`^Seat ${label}, AVAILABLE`) }).click();
}

async function holdSelected(page: Page) {
  await page.getByRole('button', { name: /^Hold \d+ seat/ }).click();
}

async function expectHoldPending(page: Page) {
  await page.getByRole('heading', { name: 'Confirm your seats' }).waitFor();
}

async function expectLostSeat(page: Page, label: string) {
  // The seat re-renders HELD and the "pick again" copy appears.
  await page.getByRole('button', { name: new RegExp(`^Seat ${label}, HELD`) }).waitFor({ timeout: 15_000 });
  await page.getByText(`${label} was just taken. Pick again.`).waitFor({ timeout: 15_000 });
}

async function confirmHold(page: Page) {
  await page.getByRole('button', { name: 'Confirm' }).click();
  await page.getByRole('heading', { name: /You're in/ }).waitFor();
}
