import type { AuthResponse } from '../types/api';
import { ApiError, parseResponse, rawFetch, type RequestOptions } from './http';

// ---------------------------------------------------------------------------
// Token storage (landmine #3)
//   - access token  : in MEMORY only (never persisted; minimizes XSS surface)
//   - refresh token : in localStorage (survives a page reload → silent re-login)
// ---------------------------------------------------------------------------

const REFRESH_TOKEN_KEY = 'mrs.refreshToken';

let accessToken: string | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();

/** Subscribe to access-token changes (used by the React auth context). */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  for (const l of listeners) l();
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/** Persist the token pair from a login/refresh response. */
export function setSession(auth: AuthResponse): void {
  accessToken = auth.accessToken;
  localStorage.setItem(REFRESH_TOKEN_KEY, auth.refreshToken);
  emit();
}

/** Drop all tokens (logout, or a dead refresh token). */
export function clearSession(): void {
  accessToken = null;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  emit();
}

/** Raised when there's no way to obtain a valid access token (no/invalid refresh token). */
export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired');
    this.name = 'SessionExpiredError';
  }
}

// ---------------------------------------------------------------------------
// Single-flight refresh (landmine #1)
//
// Refresh tokens ROTATE and the backend has REUSE DETECTION: replaying an
// already-rotated token revokes the user's whole token family. So a burst of
// concurrent 401s must trigger exactly ONE /refresh — every other caller joins
// the same in-flight promise and retries once it resolves.
// ---------------------------------------------------------------------------

let refreshInFlight: Promise<string> | null = null;

/**
 * Return a fresh access token, performing at most one /refresh across all
 * concurrent callers. The promise is assigned synchronously (before the first
 * await) so a second caller in the same tick always observes it and joins.
 */
export function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.reject(new SessionExpiredError());

  refreshInFlight = (async () => {
    try {
      const res = await rawFetch('/api/auth/refresh', {
        method: 'POST',
        json: { refreshToken },
      });
      if (!res.ok) {
        // Bad/rotated/expired refresh token → the session is unrecoverable.
        clearSession();
        throw new SessionExpiredError();
      }
      const auth = await parseResponse<AuthResponse>(res);
      setSession(auth); // stores the NEW (rotated) refresh token
      return auth.accessToken;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// ---------------------------------------------------------------------------
// Authenticated fetch: attach Bearer, retry once through the single-flight
// refresh on a 401.
// ---------------------------------------------------------------------------

function withAuth(options: RequestOptions, token: string | null): RequestOptions {
  if (!token) return options;
  return {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  };
}

/**
 * Typed fetch for PROTECTED endpoints. Attaches the access token; on a 401 it
 * runs the single-flight refresh and retries the original request exactly once
 * with the new token. Public endpoints should use `apiFetch` instead.
 */
export async function authFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await rawFetch(path, withAuth(options, accessToken));

  if (res.status === 401) {
    // Either no access token yet (post-reload) or it expired. Try to refresh.
    const newToken = await refreshAccessToken(); // throws SessionExpiredError if unrecoverable
    res = await rawFetch(path, withAuth(options, newToken));
  }

  return parseResponse<T>(res);
}

/**
 * On app load: if a refresh token survives in localStorage, exchange it for an
 * access token (silent re-login). Returns the access token, or null if there's
 * nothing to restore / the token is dead.
 */
export async function restoreSession(): Promise<string | null> {
  if (!getRefreshToken()) return null;
  try {
    return await refreshAccessToken();
  } catch (e) {
    if (e instanceof SessionExpiredError) return null;
    throw e;
  }
}

export { ApiError };
