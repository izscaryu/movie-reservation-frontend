// The catch-all 404 page. (The former Reservations/Admin placeholders have been
// replaced by their real implementations in Slices 6–7.)

export function NotFoundPage() {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-8 text-center">
      <h1 className="text-xl font-semibold">404 — Not found</h1>
      <p className="mt-2 text-sm text-slate-400">That page doesn't exist.</p>
    </div>
  );
}
