import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  authFetch,
  clearSession,
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
  setSession,
  SessionExpiredError,
} from './session';
import type { AuthResponse } from '../types/api';

// In-memory localStorage so the node test env can back the refresh token.
function installLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
}

interface FetchCounts {
  refresh: number;
  protectedTotal: number;
}

/**
 * Mock backend. A protected call 401s unless it carries the CURRENT access token
 * (which only a successful /refresh installs). /refresh rotates both tokens and
 * counts how many times it was hit.
 */
function installFetch(counts: FetchCounts) {
  let currentAccess = 'fresh-access-0';
  let refreshSeq = 0;

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = new URL(url).pathname;

      if (path === '/api/auth/refresh') {
        counts.refresh += 1;
        refreshSeq += 1;
        currentAccess = `fresh-access-${refreshSeq}`;
        const body: AuthResponse = {
          accessToken: currentAccess,
          token: currentAccess,
          tokenType: 'Bearer',
          expiresInMs: 900_000,
          refreshToken: `rt-${refreshSeq}`,
        };
        // Tiny delay so concurrent callers must share the in-flight promise.
        await new Promise((r) => setTimeout(r, 10));
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Protected endpoint.
      counts.protectedTotal += 1;
      const auth = (init?.headers as Record<string, string> | undefined)?.['Authorization'];
      if (auth === `Bearer ${currentAccess}`) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({
          timestamp: 't',
          status: 401,
          error: 'Unauthorized',
          message: 'Authentication required',
          path,
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }),
  );
}

describe('session single-flight refresh', () => {
  beforeEach(() => {
    installLocalStorage();
  });

  afterEach(() => {
    clearSession();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fires exactly one /refresh for a burst of concurrent 401s and retries all', async () => {
    const counts: FetchCounts = { refresh: 0, protectedTotal: 0 };
    installFetch(counts);

    // Stale access token + valid refresh token: every protected call will 401
    // until one /refresh installs the fresh token.
    setSession({
      accessToken: 'stale-access',
      token: 'stale-access',
      tokenType: 'Bearer',
      expiresInMs: 900_000,
      refreshToken: 'rt-initial',
    });

    const results = await Promise.all([
      authFetch<{ ok: boolean }>('/api/reservations/me'),
      authFetch<{ ok: boolean }>('/api/reservations/me'),
      authFetch<{ ok: boolean }>('/api/reservations/me'),
    ]);

    // THE assertion: one refresh for the whole burst (landmine #1).
    expect(counts.refresh).toBe(1);
    // All three requests ultimately succeeded.
    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    // The rotated refresh token from that single /refresh was stored.
    expect(getRefreshToken()).toBe('rt-1');
    // 3 initial 401s + 3 retries = 6 protected hits.
    expect(counts.protectedTotal).toBe(6);
  });

  it('reuses the in-flight refresh promise across direct concurrent callers', async () => {
    const counts: FetchCounts = { refresh: 0, protectedTotal: 0 };
    installFetch(counts);
    setSession({
      accessToken: 'stale-access',
      token: 'stale-access',
      tokenType: 'Bearer',
      expiresInMs: 900_000,
      refreshToken: 'rt-initial',
    });

    const [a, b, c] = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
      refreshAccessToken(),
    ]);

    expect(counts.refresh).toBe(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(getAccessToken()).toBe(a);
  });

  it('clears the session and throws when the refresh token is rejected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            timestamp: 't',
            status: 401,
            error: 'Unauthorized',
            message: 'Invalid or expired refresh token',
            path: '/api/auth/refresh',
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    setSession({
      accessToken: 'stale-access',
      token: 'stale-access',
      tokenType: 'Bearer',
      expiresInMs: 900_000,
      refreshToken: 'rt-dead',
    });

    await expect(refreshAccessToken()).rejects.toBeInstanceOf(SessionExpiredError);
    expect(getRefreshToken()).toBeNull();
    expect(getAccessToken()).toBeNull();
  });
});
