import { Card } from "@/components/Card";
import { StatusLine } from "@/components/StatusLine";
import { answeredCount } from "@/lib/rules/answers";
import { dayPartOf, enCA, formatDateTile, formatLongDay, formatTimeRange } from "@/lib/i18n/en-CA";
import Link from "next/link";
import type { MajorityNotice } from "@/lib/domain/majority";
import { groupForHome, type HomePlaydate } from "./home-data";
import { Kite } from "./Kite";

export type HomeViewProps = {
  /** The signed-in parent's first name; the banner says "Welcome, Alex" the first time (`welcome`). */
  firstName?: string;
  welcome?: boolean;
  /** Q4 default: one child per family in v1, so the banner names the first. */
  childName?: string;
  playdates: readonly HomePlaydate[];
  /** KD-12, Q2 default: text friends to tell that most families picked another time (under Needs you). */
  notices?: readonly MajorityNotice[];
  now: Date;
  /** The zone for the banner's date and greeting. */
  zone: string;
};

export function HomeView({ firstName, welcome = false, childName, playdates, notices = [], now, zone }: HomeViewProps) {
  const sections = groupForHome(playdates, now);
  const greeting = welcome && firstName ? enCA.home.welcome(firstName) : enCA.home.greeting[dayPartOf(now, zone)];

  return (
    <div className="flex flex-col gap-5 pb-6">
      <header className="relative overflow-hidden rounded-card bg-primary p-5 text-white">
        <p className="text-[15px] opacity-90">{formatLongDay(now, zone)}</p>
        <h1 className="mt-1 text-title font-bold leading-tight">{greeting}</h1>
        {childName && <p className="mt-1 text-base opacity-90">{enCA.home.planFor(childName)}</p>}
        <Kite className="absolute right-4 top-3 h-20 w-14 opacity-95" />
      </header>

      <Link
        href="/plan"
        className="flex min-h-[72px] items-center gap-4 rounded-card bg-card p-4 shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-2xl font-bold leading-none text-white">
          +
        </span>
        <span className="text-lg font-semibold">{enCA.home.planCard}</span>
      </Link>

      <Section title={enCA.home.sections.needsYou} playdates={sections.needs_you} render={(p) => <ProgressItem playdate={p} />}>
        {notices.map((n) => (
          <li key={n.inviteId}>
            <Card className="flex items-center justify-between gap-3">
              <p className="min-w-0 text-[15px] font-medium">{enCA.home.majorityNotice(n.name, n.rangeText)}</p>
              <a href={n.href} className="inline-flex h-11 shrink-0 items-center rounded-button bg-accent px-4 text-[15px] font-semibold text-white">
                {enCA.plan.textButton(n.name)}
              </a>
            </Card>
          </li>
        ))}
      </Section>
      <Section title={enCA.home.sections.upcoming} playdates={sections.upcoming} render={(p) => <UpcomingItem playdate={p} />} />
      <Section title={enCA.home.sections.waiting} playdates={sections.waiting} render={(p) => <ProgressItem playdate={p} />} />
    </div>
  );
}

/** A section only exists when it has something in it. */
function Section({ title, playdates, render, children }: { title: string; playdates: readonly HomePlaydate[]; render: (p: HomePlaydate) => React.ReactNode; children?: React.ReactNode[] }) {
  if (playdates.length === 0 && !children?.length) return null;
  return (
    <section aria-label={title}>
      <h2 className="mb-2 px-1 text-label font-semibold uppercase tracking-wider text-muted">{title}</h2>
      <ul className="flex flex-col gap-3">
        {children}
        {playdates.map((p) => (
          <li key={p.id}>{render(p)}</li>
        ))}
      </ul>
    </section>
  );
}

// The playdate page (/playdates/[id]) arrives with T10.
const itemLink = "block rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function Initials({ letters }: { letters: readonly string[] }) {
  return (
    <span aria-hidden="true" className="flex -space-x-2">
      {letters.map((letter, i) => (
        <span key={i} className="flex size-7 items-center justify-center rounded-full bg-primary-tint text-[13px] font-semibold text-primary ring-2 ring-card">
          {letter}
        </span>
      ))}
    </span>
  );
}

function UpcomingItem({ playdate: p }: { playdate: HomePlaydate }) {
  const tile = p.start ? formatDateTile(p.start, p.timezone) : null;
  return (
    <Link href={`/playdates/${p.id}`} className={itemLink}>
      <Card className="flex items-center gap-3">
        {tile && (
          <span aria-hidden="true" className="flex size-14 shrink-0 flex-col items-center justify-center rounded-button bg-primary-tint text-primary">
            <span className="text-label font-semibold uppercase">{tile.month}</span>
            <span className="text-xl font-bold leading-none">{tile.day}</span>
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{p.title}</span>
          {p.start && <span className="block text-[15px] text-muted">{formatTimeRange(p.start, p.end, p.timezone)}</span>}
          <span className="block truncate text-[15px] text-muted">{p.placeName ?? enCA.home.noPlace}</span>
        </span>
        <Initials letters={p.friendInitials} />
      </Card>
    </Link>
  );
}

/** Needs you and Waiting for answers: the title and "2 of 3 families answered" with a bar. */
function ProgressItem({ playdate: p }: { playdate: HomePlaydate }) {
  const { answered, total } = answeredCount(p.inviteCount, p.answers.length);
  return (
    <Link href={`/playdates/${p.id}`} className={itemLink}>
      <Card>
        <span className="flex items-center justify-between gap-3">
          <span className="min-w-0 flex-1 truncate font-semibold">{p.title}</span>
          <Initials letters={p.friendInitials} />
        </span>
        <StatusLine tone="muted" className="mt-1">
          {enCA.home.answered(answered, total)}
        </StatusLine>
        <span
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={answered}
          aria-label={enCA.home.answered(answered, total)}
          className="mt-2 block h-1.5 overflow-hidden rounded-full bg-page"
        >
          <span className="block h-full rounded-full bg-success" style={{ width: total ? `${(answered / total) * 100}%` : "0%" }} />
        </span>
      </Card>
    </Link>
  );
}
