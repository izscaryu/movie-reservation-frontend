import type { Role } from '../types/api';

/** Claims the backend puts in the HS256 access token (verified against a live token). */
export interface AccessTokenClaims {
  sub: string; // user id (string)
  email: string;
  role: Role;
  iat: number; // seconds
  exp: number; // seconds
}

/**
 * Decode (NOT verify) a JWT payload. The browser never validates the signature —
 * that's the server's job; we only read claims to drive the UI (who is logged in,
 * when the token expires). Returns null on any malformed input.
 */
export function decodeAccessToken(token: string): AccessTokenClaims | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    // base64url -> base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    const claims = JSON.parse(json) as AccessTokenClaims;
    if (!claims.sub || !claims.role) return null;
    return claims;
  } catch {
    return null;
  }
}
