/** Tiny class-name joiner — drops falsy values. No dependency on clsx. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
