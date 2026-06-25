import { describe, expect, it } from 'vitest';
import { parseUnavailableSeatLabels } from './seatConflict';

describe('parseUnavailableSeatLabels', () => {
  it('parses the live 409 message into labels', () => {
    expect(parseUnavailableSeatLabels('Seats not available: A1, A2')).toEqual(['A1', 'A2']);
  });

  it('handles a single seat', () => {
    expect(parseUnavailableSeatLabels('Seats not available: B7')).toEqual(['B7']);
  });

  it('tolerates odd spacing', () => {
    expect(parseUnavailableSeatLabels('Seats not available:A1,A2 ,A3')).toEqual([
      'A1',
      'A2',
      'A3',
    ]);
  });

  it('returns [] for an unrelated message', () => {
    expect(parseUnavailableSeatLabels('showtimeSeatIds: must not be empty')).toEqual([]);
    expect(parseUnavailableSeatLabels(null)).toEqual([]);
    expect(parseUnavailableSeatLabels(undefined)).toEqual([]);
  });
});
