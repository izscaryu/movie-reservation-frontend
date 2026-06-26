// Temporary placeholder for admin sections not yet built. Replaced as Slice 7
// parts land: Showtimes (Part C), Reports (Part D), Reservations (Part E).
export default function AdminStub({ title, part }: { title: string; part: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">Coming in {part}.</p>
    </div>
  );
}
