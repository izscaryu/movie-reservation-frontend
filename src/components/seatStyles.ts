import type { CSSProperties } from 'react';

// Diagonal hatch applied to HELD seats — the extra texture (on top of the muted
// ocher fill) guarantees HELD never reads as the brass "selected" state. Shared
// by the seat grid and its legend so the two always match.
export const HELD_HATCH: CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(45deg, rgba(0,0,0,0.28) 0, rgba(0,0,0,0.28) 2px, transparent 2px, transparent 5px)',
};
