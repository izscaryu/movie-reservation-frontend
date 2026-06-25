import { NavLink, Outlet } from 'react-router-dom';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
  }`;

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <NavLink to="/" className="mr-4 text-lg font-bold tracking-tight">
            🎬 Reservations
          </NavLink>
          <NavLink to="/" end className={linkClass}>
            Movies
          </NavLink>
          <NavLink to="/reservations" className={linkClass}>
            My Reservations
          </NavLink>
          <NavLink to="/admin" className={linkClass}>
            Admin
          </NavLink>
          <div className="ml-auto flex items-center gap-2">
            <NavLink to="/login" className={linkClass}>
              Log in
            </NavLink>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
