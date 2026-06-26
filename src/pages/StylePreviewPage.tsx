// TEMPORARY — design-foundation preview for Slice 8 / Part 1a. Mounted at /style
// so the visual direction can be reviewed on one screen before it is rolled out
// across real pages. Remove once Part 1 rollout is complete.
//
// Vertical rhythm used throughout: tight WITHIN a group (gap-3 / space-y-2),
// generous BETWEEN groups (section mb-20, subgroup mt-10 + hairline, header mb-8).
import type { ReactNode } from 'react';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Eyebrow from '../components/ui/Eyebrow';
import { Field, Input, Select } from '../components/ui/Input';
import Loading from '../components/ui/Loading';
import PageHeader from '../components/ui/PageHeader';
import Skeleton from '../components/ui/Skeleton';
import Spinner from '../components/ui/Spinner';
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table';
import TicketStub from '../components/ui/TicketStub';
import { cn } from '../lib/cn';

export default function StylePreviewPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 pb-28 pt-20">
      {/* Marquee header mock — the direction for the global nav. */}
      <div className="mb-16 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-ink-line pb-5">
        <span className="font-display text-xl font-semibold tracking-tight text-paper">
          <span className="text-brass">◆</span> The Orpheum
        </span>
        <nav className="flex items-center gap-5 text-[0.6875rem] font-semibold uppercase tracking-eyebrow text-paper-faint">
          <span className="text-paper">Now Showing</span>
          <span>My Tickets</span>
          <span>Admin</span>
        </nav>
        <div className="ml-auto">
          <Button size="sm" variant="secondary">
            Log in
          </Button>
        </div>
      </div>

      <div className="mb-20">
        <PageHeader
          eyebrow="Slice 8 · Foundation"
          title="A house style for The Orpheum"
          subtitle="Warm editorial × dark cinema. Bold spent in one place — the ticket stub — and kept quiet everywhere else. Review the tokens, spacing, and surfaces here before they roll across the pages."
        />
      </div>

      {/* PALETTE ---------------------------------------------------------- */}
      <Section eyebrow="Palette" title="Warm near-black, brass accent">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Swatch name="ink" hex="#100D0A" className="bg-ink" note="page" />
          <Swatch name="ink.raised" hex="#1C1712" className="bg-ink-raised" note="cards" />
          <Swatch name="ink.field" hex="#231C14" className="bg-ink-field" note="inputs" />
          <Swatch name="ink.line" hex="#33291C" className="bg-ink-line" note="borders" />
          <Swatch name="paper" hex="#F2EADB" className="bg-paper" dark note="text" />
          <Swatch name="paper.dim" hex="#C8BCA9" className="bg-paper-dim" dark note="secondary" />
          <Swatch name="brass" hex="#C49A3F" className="bg-brass" dark note="accent" />
          <Swatch name="brass.bright" hex="#ECB64A" className="bg-brass-bright" dark note="hover/glow" />
        </div>
      </Section>

      {/* TYPE ------------------------------------------------------------- */}
      <Section eyebrow="Typography" title="Fraunces · Hanken Grotesk · IBM Plex Mono">
        <div>
          <SubLabel>Display — Fraunces (self-hosted, variable, optical sizing)</SubLabel>
          <div className="space-y-2">
            <p className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-paper">
              Now showing, in warm light
            </p>
            <p className="font-display text-3xl font-medium text-paper">Dune: Part Two</p>
          </div>
        </div>

        <div className="mt-10 border-t border-ink-line pt-10">
          <SubLabel>Body — Hanken Grotesk</SubLabel>
          <p className="max-w-2xl text-base leading-relaxed text-paper-dim">
            A single-screen revival house. Pick a film, claim your seats, and hold them while
            the projector warms up. The body face stays quiet so the display and the brass can
            carry the personality.
          </p>
          <div className="mt-4 flex flex-wrap gap-5 text-sm">
            <span className="font-normal text-paper">Regular 400</span>
            <span className="font-medium text-paper">Medium 500</span>
            <span className="font-semibold text-paper">Semibold 600</span>
            <span className="font-bold text-paper">Bold 700</span>
          </div>
        </div>

        <div className="mt-10 border-t border-ink-line pt-10">
          <SubLabel>Data — IBM Plex Mono (the “printed on the ticket” voice)</SubLabel>
          <div className="space-y-2">
            <p className="font-mono text-lg tabular-nums text-paper">
              ROW C · SEAT 07 &nbsp; 2026-07-02 19:30 &nbsp;{' '}
              <span className="text-brass">$27.00</span>
            </p>
            <p className="font-mono text-3xl font-semibold tabular-nums text-paper">04:58</p>
          </div>
        </div>
      </Section>

      {/* BUTTONS ---------------------------------------------------------- */}
      <Section eyebrow="Controls" title="Buttons">
        <div className="space-y-8">
          <div>
            <SubLabel>Variants</SubLabel>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Hold 2 seats</Button>
              <Button variant="secondary">Refresh map</Button>
              <Button variant="ghost">Keep</Button>
              <Button variant="danger">Release hold</Button>
            </div>
          </div>
          <div>
            <SubLabel>Sizes &amp; states</SubLabel>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button disabled>Disabled</Button>
              <Button variant="secondary" disabled>
                Holding…
              </Button>
            </div>
          </div>
          <div>
            <SubLabel>Full width</SubLabel>
            <Button fullWidth size="lg">
              Confirm
            </Button>
          </div>
        </div>
      </Section>

      {/* INPUTS ----------------------------------------------------------- */}
      <Section eyebrow="Controls" title="Inputs">
        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <Field label="Email" htmlFor="demo-email" hint="We never share it.">
            <Input id="demo-email" type="email" placeholder="you@example.com" />
          </Field>
          <Field label="Status" htmlFor="demo-status">
            <Select id="demo-status" defaultValue="">
              <option value="">All</option>
              <option>Confirmed</option>
              <option>Pending</option>
            </Select>
          </Field>
          <Field label="From" htmlFor="demo-date">
            <Input id="demo-date" type="date" />
          </Field>
          <Field label="Password" htmlFor="demo-pw" error="Incorrect email or password.">
            <Input id="demo-pw" type="password" defaultValue="secret" />
          </Field>
        </div>
      </Section>

      {/* CARDS ------------------------------------------------------------ */}
      <Section eyebrow="Surfaces" title="Cards">
        <div className="grid gap-6 sm:grid-cols-3">
          <Card>
            <h3 className="font-display text-lg font-semibold text-paper">Plain card</h3>
            <p className="mt-2 text-sm text-paper-dim">
              Raised surface, catch-light top edge, soft ambient depth.
            </p>
          </Card>
          <Card topRule className="shadow-glow">
            <h3 className="font-display text-lg font-semibold text-paper">Emphasis</h3>
            <p className="mt-2 text-sm text-paper-dim">
              Brass top rule + glow — for the one panel that should lead.
            </p>
          </Card>
          <Card interactive>
            <h3 className="font-display text-lg font-semibold text-paper">La Notte</h3>
            <p className="mt-1 font-mono text-sm text-paper-faint">2h 02m</p>
            <div className="mt-3 flex gap-1.5">
              <Badge tone="neutral">Drama</Badge>
              <Badge tone="neutral">Italian</Badge>
            </div>
          </Card>
        </div>

        {/* Internal padding hierarchy: a distinct header zone over the body. */}
        <Card padded={false} className="mt-6 max-w-md overflow-hidden">
          <div className="border-b border-ink-line px-6 py-5">
            <Eyebrow>Now showing</Eyebrow>
            <h3 className="mt-2 font-display text-xl font-semibold text-paper">
              Sectioned card
            </h3>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-paper-dim">
              A heavier header padding over a quieter body — the rhythm used for detail panels.
            </p>
          </div>
        </Card>
      </Section>

      {/* STATES ----------------------------------------------------------- */}
      <Section eyebrow="States" title="Loading, error & empty">
        <div className="space-y-8">
          <div>
            <SubLabel>Alerts — direction, not mood</SubLabel>
            <div className="max-w-xl space-y-3">
              <Alert tone="error">A3, A4 were just taken. Pick again.</Alert>
              <Alert tone="success">Account created — log in to continue.</Alert>
              <Alert tone="warning">Your hold timer has run out. You can still try to confirm.</Alert>
              <Alert tone="info">Holds last about 10 minutes and release automatically.</Alert>
            </div>
          </div>
          <div>
            <SubLabel>Loading</SubLabel>
            <div className="flex flex-wrap items-center gap-8">
              <Loading>Loading movies…</Loading>
              <Spinner />
            </div>
            <div className="mt-4 grid max-w-sm grid-cols-3 gap-2">
              <Skeleton className="h-4" />
              <Skeleton className="h-4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <div>
            <SubLabel>Empty — an invitation to act</SubLabel>
            <EmptyState title="No films found" action={<Button>Browse movies</Button>}>
              Check back soon for what's showing.
            </EmptyState>
          </div>
        </div>
      </Section>

      {/* BADGES ----------------------------------------------------------- */}
      <Section eyebrow="Status" title="Reservation badges — four distinct states">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="confirmed">CONFIRMED</Badge>
          <Badge tone="pending">PENDING</Badge>
          <Badge tone="cancelled">CANCELLED</Badge>
          <Badge tone="expired">EXPIRED</Badge>
          <span className="mx-2 h-5 w-px bg-ink-line" />
          <Badge tone="neutral">Sci-Fi</Badge>
          <Badge tone="brass">Now showing</Badge>
        </div>
        <p className="mt-4 text-sm text-paper-faint">
          Green / amber / stone / red read apart at a glance; brass is reserved for the brand,
          never a status, so confirmed and pending never collide.
        </p>
      </Section>

      {/* SEAT STATES ------------------------------------------------------ */}
      <Section eyebrow="Seat grid" title="Five states, side by side">
        <div className="flex flex-wrap items-end gap-6">
          <SeatSpec kind="open" n={7} label="Available" />
          <SeatSpec kind="selected" n={7} label="Selected" />
          <SeatSpec kind="held" n={7} label="Held" />
          <SeatSpec kind="booked" n={7} label="Booked" />
          <SeatSpec kind="booked" n={7} label="Just lost" ring />
        </div>

        <div className="mt-10">
          <SubLabel>A live picker row — the vermilion ring marks seats lost to a 409</SubLabel>
          <div className="inline-flex flex-col gap-2 rounded-lg border border-ink-line bg-ink-raised p-5 shadow-card">
            <span className="text-center text-[0.625rem] uppercase tracking-eyebrow text-paper-faint">
              ⎯⎯ Screen ⎯⎯
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-4 text-right font-mono text-xs text-paper-faint">C</span>
              <SeatChip kind="open" n={5} />
              <SeatChip kind="selected" n={6} />
              <SeatChip kind="held" n={7} />
              <SeatChip kind="booked" n={8} ring />
              <SeatChip kind="open" n={9} />
              <SeatChip kind="open" n={10} />
            </div>
          </div>
          <p className="mt-4 text-sm text-paper-faint">
            Brass <span className="text-brass">selected</span> vs ocher{' '}
            <span className="text-seat-held-text">held</span> (hatched) stay unmistakable; held and
            booked are inert, available invites a click.
          </p>
        </div>
      </Section>

      {/* TABLE ------------------------------------------------------------ */}
      <Section eyebrow="Data" title="Editorial table — the admin surface">
        <Table>
          <THead>
            <tr>
              <TH>#</TH>
              <TH>Movie</TH>
              <TH>Showtime</TH>
              <TH>Status</TH>
              <TH numeric>Total</TH>
            </tr>
          </THead>
          <TBody>
            <TR>
              <TD className="font-mono tabular-nums text-paper-faint">1042</TD>
              <TD className="text-paper">Dune: Part Two</TD>
              <TD>2026-07-02 19:30</TD>
              <TD>
                <Badge tone="confirmed">CONFIRMED</Badge>
              </TD>
              <TD numeric>$27.00</TD>
            </TR>
            <TR>
              <TD className="font-mono tabular-nums text-paper-faint">1043</TD>
              <TD className="text-paper">La Notte</TD>
              <TD>2026-07-03 21:00</TD>
              <TD>
                <Badge tone="pending">PENDING</Badge>
              </TD>
              <TD numeric>$13.50</TD>
            </TR>
            <TR>
              <TD className="font-mono tabular-nums text-paper-faint">1044</TD>
              <TD className="text-paper">Stalker</TD>
              <TD>2026-07-04 18:00</TD>
              <TD>
                <Badge tone="cancelled">CANCELLED</Badge>
              </TD>
              <TD numeric>$40.00</TD>
            </TR>
          </TBody>
        </Table>
      </Section>

      {/* SIGNATURE — TICKET STUB ----------------------------------------- */}
      <Section eyebrow="Signature" title="The ticket stub">
        <div className="flex flex-wrap items-start gap-10">
          <TicketStub
            admit={2}
            title="Dune: Part Two"
            seats="C7, C8"
            when="Thu 2 Jul · 19:30"
            serial={1042}
            price="$27.00"
            footer={
              <div>
                <div className="rounded-md border border-ink-line bg-ink p-3 text-center">
                  <p className="text-[0.625rem] uppercase tracking-eyebrow text-paper-faint">
                    Hold expires in
                  </p>
                  <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-paper">
                    04:58
                  </p>
                </div>
                <div className="mt-4 flex gap-3">
                  <Button fullWidth>Confirm</Button>
                  <Button variant="danger">Release</Button>
                </div>
              </div>
            }
          />
          <div className="max-w-xs space-y-3 pt-2">
            <Eyebrow>Why a stub</Eyebrow>
            <p className="text-sm leading-relaxed text-paper-dim">
              It lands on the app's emotional peak — you got the seats — and it's diegetic: a
              cinema's data really is monospaced on a printed stub. The perforation is punched
              with the page colour, so it reads as a tear-off, not a border trick.
            </p>
            <p className="text-sm leading-relaxed text-paper-dim">
              Everything else stays restrained; this is the one thing the page is remembered by.
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ---- local preview helpers (not part of the design system) -------------- */

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-20">
      <header className="mb-8">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-3 font-display text-2xl font-semibold text-paper">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function SubLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-[0.6875rem] uppercase tracking-eyebrow text-paper-faint">{children}</p>
  );
}

function Swatch({
  name,
  hex,
  className,
  note,
  dark = false,
}: {
  name: string;
  hex: string;
  className: string;
  note: string;
  dark?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-ink-line shadow-card">
      <div className={cn('flex h-16 items-end p-2', className)}>
        <span className={cn('font-mono text-[0.625rem]', dark ? 'text-ink/70' : 'text-paper/70')}>
          {hex}
        </span>
      </div>
      <div className="bg-ink-raised px-3 py-2">
        <p className="font-mono text-xs text-paper">{name}</p>
        <p className="text-[0.625rem] text-paper-faint">{note}</p>
      </div>
    </div>
  );
}

type SeatKind = 'open' | 'selected' | 'held' | 'booked';

const SEAT_CLASS: Record<SeatKind, string> = {
  open: 'bg-seat-open text-paper-dim',
  selected: 'bg-brass text-ink',
  held: 'bg-seat-held text-seat-held-text',
  booked: 'bg-seat-booked text-seat-booked-text',
};

const HELD_HATCH = {
  backgroundImage:
    'repeating-linear-gradient(45deg, rgba(0,0,0,0.28) 0, rgba(0,0,0,0.28) 2px, transparent 2px, transparent 5px)',
};

function SeatChip({ kind, n, ring = false }: { kind: SeatKind; n: number; ring?: boolean }) {
  return (
    <span
      style={kind === 'held' ? HELD_HATCH : undefined}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded font-mono text-xs font-medium',
        SEAT_CLASS[kind],
        ring && 'ring-2 ring-alert ring-offset-2 ring-offset-ink',
      )}
    >
      {n}
    </span>
  );
}

function SeatSpec({
  kind,
  n,
  label,
  ring = false,
}: {
  kind: SeatKind;
  n: number;
  label: string;
  ring?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <SeatChip kind={kind} n={n} ring={ring} />
      <span className="text-[0.625rem] uppercase tracking-eyebrow text-paper-faint">{label}</span>
    </div>
  );
}
