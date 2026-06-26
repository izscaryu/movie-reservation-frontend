import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '../../lib/cn';
import Eyebrow from '../../components/ui/Eyebrow';

const subLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-brass text-ink'
      : 'border border-ink-line text-paper-dim hover:bg-ink-raised hover:text-paper',
  );

/** Admin area shell: title + section sub-nav + the active section (Outlet). */
export default function AdminLayout() {
  return (
    <div>
      <div className="mb-8 border-b border-ink-line pb-5">
        <Eyebrow>The Orpheum</Eyebrow>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-paper">
          Admin
        </h1>
        <nav className="mt-5 flex flex-wrap gap-2">
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
      </div>
      <Outlet />
    </div>
  );
}
