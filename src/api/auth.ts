import { apiFetch } from '../lib/http';
import { clearSession, getRefreshToken, setSession } from '../lib/session';
import type { AuthResponse, LoginRequest, SignupRequest, UserResponse } from '../types/api';

/** Signup does NOT log you in — returns the created user, no token. */
export function signup(body: SignupRequest): Promise<UserResponse> {
  return apiFetch('/api/auth/signup', { method: 'POST', json: body });
}

/** Login → stores the token pair in the session, returns the raw AuthResponse. */
export async function login(body: LoginRequest): Promise<AuthResponse> {
  const auth = await apiFetch<AuthResponse>('/api/auth/login', { method: 'POST', json: body });
  setSession(auth);
  return auth;
}

/**
 * Logout: best-effort revoke of the refresh token server-side (idempotent → 204
 * even for an unknown token), then clear local tokens regardless of the result.
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await apiFetch('/api/auth/logout', { method: 'POST', json: { refreshToken } });
    }
  } catch {
    // Network/other failure shouldn't trap the user in a logged-in UI.
  } finally {
    clearSession();
  }
}
