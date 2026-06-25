import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { login as apiLogin, logout as apiLogout, signup as apiSignup } from '../api/auth';
import { decodeAccessToken } from '../lib/jwt';
import {
  getAccessToken,
  restoreSession,
  subscribe,
} from '../lib/session';
import type { LoginRequest, Role, SignupRequest, UserResponse } from '../types/api';

export interface CurrentUser {
  id: number;
  email: string;
  role: Role;
}

interface AuthContextValue {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  /** True until the on-load silent re-login attempt settles. */
  isInitializing: boolean;
  login: (body: LoginRequest) => Promise<void>;
  signup: (body: SignupRequest) => Promise<UserResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Derive the UI user from the in-memory access token (claims only — not verified). */
function userFromToken(): CurrentUser | null {
  const token = getAccessToken();
  if (!token) return null;
  const claims = decodeAccessToken(token);
  if (!claims) return null;
  return { id: Number(claims.sub), email: claims.email, role: claims.role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(userFromToken);
  const [isInitializing, setIsInitializing] = useState(true);

  // Reflect every session change (login, refresh-rotation, logout) into React state.
  useEffect(() => subscribe(() => setUser(userFromToken())), []);

  // Silent re-login on load: exchange a stored refresh token for an access token.
  useEffect(() => {
    let cancelled = false;
    restoreSession()
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setIsInitializing(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (body: LoginRequest) => {
    await apiLogin(body); // setSession() inside fires the subscriber → updates user
  }, []);

  const signup = useCallback((body: SignupRequest) => apiSignup(body), []);

  const logout = useCallback(async () => {
    await apiLogout();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isAdmin: user?.role === 'ADMIN',
      isInitializing,
      login,
      signup,
      logout,
    }),
    [user, isInitializing, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
