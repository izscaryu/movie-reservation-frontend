// Placeholder pages for the routing skeleton. Each is replaced by its real
// implementation in a later slice (noted per page).

function Placeholder({ title, slice }: { title: string; slice: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-slate-400">Coming in {slice}.</p>
    </div>
  );
}

export function MovieDetailPage() {
  return <Placeholder title="Movie detail" slice="Slice 3" />;
}

export function SeatPickerPage() {
  return <Placeholder title="Seat picker" slice="Slice 4" />;
}

export function ReservationsPage() {
  return <Placeholder title="My reservations" slice="Slice 6" />;
}

export function AdminPage() {
  return <Placeholder title="Admin dashboard" slice="Slice 7" />;
}

export function NotFoundPage() {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-8 text-center">
      <h1 className="text-xl font-semibold">404 — Not found</h1>
      <p className="mt-2 text-sm text-slate-400">That page doesn't exist.</p>
    </div>
  );
}
