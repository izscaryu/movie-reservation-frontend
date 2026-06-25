import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

function FullPageMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-slate-400">{children}</div>
  );
}

/** Gate for any logged-in user. Redirects to /login (preserving the intended path). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <FullPageMessage>Restoring session…</FullPageMessage>;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

/** Gate for ADMIN only. Non-admins who are logged in get a 403-style notice. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <FullPageMessage>Restoring session…</FullPageMessage>;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-amber-900 bg-amber-950/40 p-8 text-center">
        <h1 className="text-xl font-semibold text-amber-200">Admins only</h1>
        <p className="mt-2 text-sm text-amber-200/70">
          You're signed in, but this area requires the ADMIN role.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
