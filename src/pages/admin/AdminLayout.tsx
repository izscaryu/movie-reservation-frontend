import { NavLink, Outlet } from 'react-router-dom';

const subLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-indigo-600 text-white' : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
  }`;

/** Admin area shell: title + section sub-nav + the active section (Outlet). */
export default function AdminLayout() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Admin</h1>
      <nav className="mt-4 flex flex-wrap gap-2 border-b border-slate-800 pb-4">
        <NavLink to="/admin/movies" className={subLink}>
          Movies
        </NavLink>
        <NavLink to="/admin/showtimes" className={subLink}>
          Showtimes
        </NavLink>
        <NavLink to="/admin/reports" className={subLink}>
          Reports
        </NavLink>
        <NavLink to="/admin/reservations" className={subLink}>
          Reservations
        </NavLink>
      </nav>
      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
