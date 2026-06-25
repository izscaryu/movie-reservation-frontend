// Display helpers.
//
// The backend returns LocalDateTime strings in UTC but WITHOUT a zone designator
// (e.g. "2028-10-15T23:15:00", and expiresAt "2026-06-25T18:14:10.92"). Verified
// live: a fresh hold's expiresAt is now+600s only when parsed as UTC; parsed as
// browser-local it reads as already-expired by the TZ offset. So we parse these as
// UTC and render them in UTC, which shows exactly the stored wall-clock with no
// off-by-offset or date-rollover surprises across timezones.

/** Parse a backend timestamp as UTC (append Z when it carries no zone). */
export function parseServerInstant(iso: string): Date {
  const hasTime = iso.includes('T');
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso);
  return new Date(hasTime && !hasZone ? `${iso}Z` : iso);
}

const dateTimeFmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' });

const timeFmt = new Intl.DateTimeFormat(undefined, { timeStyle: 'short', timeZone: 'UTC' });

export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(parseServerInstant(iso));
}

export function formatDate(iso: string): string {
  return dateFmt.format(parseServerInstant(iso));
}

export function formatTime(iso: string): string {
  return timeFmt.format(parseServerInstant(iso));
}

/** Local YYYY-MM-DD for a <input type="date"> value and the ?date= query param. */
export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
