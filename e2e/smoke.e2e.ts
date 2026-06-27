import { test, expect } from '@playwright/test';

/**
 * Light smoke pass — NOT an exhaustive E2E suite. Three checks that the app
 * boots against the live backend, auth works, and the seat map (the centerpiece)
 * renders. Deeper behavior is covered at the contract level + by the Vitest unit
 * tests. Requires the dev server (5173) + backend (8080) up, and the seeded demo
 * user demo-a@orpheum.test.
 */

const DEMO_USER = { email: 'demo-a@orpheum.test', password: 'Password123!' };
const SHOWTIME_ID = 146;

test('app boots — the marquee renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'The Orpheum' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Now Showing' })).toBeVisible();
});

test('login authenticates the session', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(DEMO_USER.email);
  await page.getByLabel('Password').fill(DEMO_USER.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  // The header swaps to the authed state once the token pair is stored.
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
});

test('seat map renders for a showtime', async ({ page }) => {
  await page.goto(`/showtimes/${SHOWTIME_ID}/seats`);
  await expect(page.getByRole('button', { name: /^Seat A1,/ })).toBeVisible();
  await expect(page.getByText('Screen')).toBeVisible();
});
