// The catch-all 404 page. (The former Reservations/Admin placeholders have been
// replaced by their real implementations in Slices 6–7.)
import { Link } from 'react-router-dom';
import { buttonClasses } from '../components/ui/buttonClasses';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-ink-line bg-ink-raised p-10 text-center shadow-card">
      <p className="font-mono text-sm uppercase tracking-eyebrow text-brass">404</p>
      <h1 className="mt-3 font-display text-2xl font-semibold text-paper">Nothing showing here</h1>
      <p className="mt-2 text-sm text-paper-dim">That page doesn't exist.</p>
      <Link to="/" className={cnLink}>
        Back to Now Showing
      </Link>
    </div>
  );
}

const cnLink = `mt-6 inline-flex ${buttonClasses({ size: 'md' })}`;
