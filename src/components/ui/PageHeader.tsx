import type { ReactNode } from 'react';
import Eyebrow from './Eyebrow';

/** Editorial page masthead: eyebrow + Fraunces title + optional subtitle/actions. */
export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-ink-line pb-5">
      <div className="space-y-2">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-paper sm:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="max-w-xl text-sm text-paper-dim">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
