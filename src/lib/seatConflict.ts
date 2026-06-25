// The backend reports a seat-hold conflict (409) through the uniform error body's
// `message` field, naming the failed seats by LABEL, not as a structured array:
//
//   { "status": 409, "message": "Seats not available: A1, A2", ... }
//
// Verified live against the Phase 10 backend. This parses those labels back out so
// the UI can highlight exactly which seats were lost and let the user re-pick
// (landmine #5) instead of showing a generic error.

const PREFIX = /^Seats not available:\s*/i;

/** Extract seat labels from a 409 conflict message. Returns [] if it doesn't match. */
export function parseUnavailableSeatLabels(message: string | null | undefined): string[] {
  if (!message || !PREFIX.test(message)) return [];
  return message
    .replace(PREFIX, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
