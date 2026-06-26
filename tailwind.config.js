/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces — warm near-black (umber undertone), not slate.
        ink: {
          DEFAULT: '#100D0A', // page base
          raised: '#1C1712', // cards / panels — a touch lighter for separation
          field: '#231C14', // inputs / hover
          line: '#33291C', // hairline borders — more defined
        },
        // Text — warm off-white, like projector light on a screen.
        paper: {
          DEFAULT: '#F2EADB',
          dim: '#C8BCA9', // nudged lighter — comfortably AA on the ink background
          faint: '#9C9082', // captions / eyebrows — still AA, no longer murky
        },
        // Brand accent — muted brass, with a brighter amber for hover/glow.
        brass: {
          DEFAULT: '#C49A3F',
          bright: '#ECB64A',
          dim: '#8A6E2E',
        },
        // Danger action (release / delete / cancel-confirm).
        danger: {
          DEFAULT: '#9B3B30',
          bright: '#B3463A',
        },
        // The just-lost-seat ring + hard alerts — must punch on camera.
        alert: '#F0644B',
        // Reservation status — four mutually distinct hues, tuned warm.
        status: {
          confirmed: '#6E9466', // patina green
          pending: '#E8B44C', // honey amber
          cancelled: '#847A6A', // stone
          expired: '#C2533F', // oxblood red
        },
        // Seat-grid states — semantics preserved, hues retuned to the palette.
        seat: {
          open: '#3A3026',
          'open-hover': '#4A3D2E',
          held: '#5C4E27',
          'held-text': '#B0A06A',
          booked: '#4A211D',
          'booked-text': '#9C6A63',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Hanken Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        eyebrow: '0.18em',
      },
      boxShadow: {
        // Elevation on a dark UI comes from a catch-light top edge + a soft, deep
        // ambient shadow, not a flat drop shadow (which disappears on near-black).
        card: 'inset 0 1px 0 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.5), 0 18px 45px -22px rgba(0,0,0,0.95)',
        glow: '0 0 0 1px rgba(196,154,63,0.5), 0 0 32px -4px rgba(236,182,74,0.4)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        rise: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease both',
        rise: 'rise 0.35s ease both',
      },
    },
  },
  plugins: [],
};
