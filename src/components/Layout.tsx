import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { cn } from '../lib/cn';
import Button from './ui/Button';
import { buttonClasses } from './ui/buttonClasses';

const linkBase = 'text-xs font-semibold uppercase tracking-[0.12em] transition-colors';
const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(linkBase, isActive ? 'text-brass' : 'text-paper-dim hover:text-paper');

export default function Layout() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-ink-line bg-ink/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
          <NavLink
            to="/"
            className="mr-2 inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-paper"
          >
            <span aria-hidden className="text-brass">
              ◆
            </span>
            The Orpheum
          </NavLink>
          <NavLink to="/" end className={linkClass}>
            Now Showing
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/reservations" className={linkClass}>
              My Tickets
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={linkClass}>
              Admin
            </NavLink>
          )}

          <div className="ml-auto flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="hidden text-xs text-paper-faint sm:inline">{user?.email}</span>
                <Button variant="secondary" size="sm" onClick={onLogout}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={linkClass}>
                  Log in
                </NavLink>
                <NavLink to="/signup" className={buttonClasses({ size: 'sm' })}>
                  Sign up
                </NavLink>
              </>
            )}
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:py-12">
        <Outlet />
      </main>
    </div>
  );
}
