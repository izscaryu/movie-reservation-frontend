import { describe, expect, it } from 'vitest';
import { parseServerInstant } from './format';

describe('parseServerInstant', () => {
  it('treats a zoneless datetime as UTC (the live backend format)', () => {
    // Verified live: a fresh hold expiresAt is now+600s only when parsed as UTC.
    expect(parseServerInstant('2026-06-25T18:14:10.92').getTime()).toBe(
      Date.parse('2026-06-25T18:14:10.92Z'),
    );
  });

  it('leaves an explicit Z untouched', () => {
    expect(parseServerInstant('2026-06-25T18:14:10Z').getTime()).toBe(
      Date.parse('2026-06-25T18:14:10Z'),
    );
  });

  it('leaves an explicit offset untouched', () => {
    expect(parseServerInstant('2026-06-25T18:14:10+02:00').getTime()).toBe(
      Date.parse('2026-06-25T18:14:10+02:00'),
    );
  });

  it('parses a date-only string as UTC midnight (no Z appended)', () => {
    expect(parseServerInstant('2028-10-15').getTime()).toBe(Date.parse('2028-10-15'));
  });
});
