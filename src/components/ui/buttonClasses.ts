// Button styling, kept separate from the component so links that need to look
// like buttons (react-router <Link>) can reuse the exact same classes.

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brass text-ink hover:bg-brass-bright',
  secondary:
    'border border-ink-line bg-transparent text-paper-dim hover:border-brass/50 hover:bg-ink-raised hover:text-paper',
  ghost: 'text-paper-dim hover:bg-ink-raised hover:text-paper',
  danger: 'bg-danger text-paper hover:bg-danger-bright',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export function buttonClasses(
  opts: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean } = {},
): string {
  const { variant = 'primary', size = 'md', fullWidth = false } = opts;
  return [BASE, VARIANTS[variant], SIZES[size], fullWidth ? 'w-full' : '']
    .filter(Boolean)
    .join(' ');
}
