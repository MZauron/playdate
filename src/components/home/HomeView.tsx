import { Card } from "@/components/Card";
import { StatusLine } from "@/components/StatusLine";
import { answeredCount } from "@/lib/rules/answers";
import { dayPartOf, enCA, formatDateTile, formatLongDay, formatTimeRange } from "@/lib/i18n/en-CA";
import Link from "next/link";
import type { MajorityNotice } from "@/lib/domain/majority";
import type { HomeInvite } from "@/lib/db/invites";
import type { HomeStatus } from "@/lib/rules/home";
import { homeList, type HomePlaydate } from "./home-data";
import { Kite } from "./Kite";

export type HomeViewProps = {
  /** The signed-in parent's first name; the banner says "Welcome, Alex" the first time (`welcome`). */
  firstName?: string;
  welcome?: boolean;
  /** Q4 default: one child per family in v1, so the banner names the first. */
  childName?: string;
  playdates: readonly HomePlaydate[];
  /** KD-12, Q2 default: text friends to tell that most families picked another time (under that playdate's card). */
  notices?: readonly MajorityNotice[];
  /** T15: invites from other Kindred parents, opened at /invites/[id]. */
  invites?: readonly HomeInvite[];
  now: Date;
  /** The zone for the banner's date and greeting. */
  zone: string;
};

export function HomeView({ firstName, welcome = false, childName, playdates, notices = [], invites = [], now, zone }: HomeViewProps) {
  const items = homeList(playdates, invites, now);
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
        <span className="min-w-0">
          <span className="block text-lg font-semibold">{enCA.home.planCard}</span>
          {items.length === 0 && <span className="block text-[15px] text-muted">{enCA.home.emptyNote}</span>}
        </span>
      </Link>

      {/* KD-13 (Q24): one list, soonest first, the parent's own playdates and the invites they received together. */}
      {items.length > 0 && (
        <section aria-labelledby="home-list-title">
          <h2 id="home-list-title" className="mb-2 px-1 text-label font-semibold uppercase tracking-wider text-muted">
            {enCA.home.listTitle}
          </h2>
          <ul className="flex flex-col gap-3">
            {items.map((item) =>
              item.kind === "invite" ? (
                <li key={`i-${item.invite.inviteId}`}>
                  <InviteItem invite={item.invite} childName={childName ?? null} />
                </li>
              ) : (
                <li key={item.playdate.id} className="flex flex-col gap-2">
                  <PlaydateItem playdate={item.playdate} status={item.status} />
                  {notices
                    .filter((n) => n.playdateId === item.playdate.id)
                    .map((n) => (
                      <Card key={n.inviteId} className="flex items-center justify-between gap-3">
                        <p className="min-w-0 text-[15px] font-medium">{enCA.home.majorityNotice(n.name, n.rangeText)}</p>
                        <a href={n.href} className="inline-flex h-11 shrink-0 items-center rounded-button bg-accent px-4 text-[15px] font-semibold text-white">
                          {enCA.plan.textButton(n.name)}
                        </a>
                      </Card>
                    ))}
                </li>
              ),
            )}
          </ul>
        </section>
      )}
    </div>
  );
}

const itemLink = "block rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function Initials({ letters }: { letters: readonly string[] }) {
  return (
    <span aria-hidden="true" className="flex shrink-0 -space-x-2">
      {letters.map((letter, i) => (
        <span key={i} className="flex size-7 items-center justify-center rounded-full bg-primary-tint text-[13px] font-semibold text-primary ring-2 ring-card">
          {letter}
        </span>
      ))}
    </span>
  );
}

/** The date tile, or a "?" tile while the time is still to be decided, so every card lines up. */
function DateTile({ start, zone }: { start: Date | null; zone: string }) {
  const tile = start ? formatDateTile(start, zone) : null;
  return (
    <span aria-hidden="true" className="flex size-14 shrink-0 flex-col items-center justify-center rounded-button bg-primary-tint text-primary">
      {tile ? (
        <>
          <span className="text-label font-semibold uppercase">{tile.month}</span>
          <span className="text-xl font-bold leading-none">{tile.day}</span>
        </>
      ) : (
        <span className="text-xl font-bold leading-none">?</span>
      )}
    </span>
  );
}

/** One status line. Needs you is dark text after a coral dot (coral text is too light to read at this size). */
function HomeStatusLine({ tone, children }: { tone: "needs_you" | "success" | "danger" | "muted"; children: React.ReactNode }) {
  if (tone === "needs_you") {
    return (
      <p className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent" />
        {children}
      </p>
    );
  }
  return <StatusLine tone={tone}>{children}</StatusLine>;
}

function Row({ start, zone, title, when, initials, status }: { start: Date | null; zone: string; title: string; when: string; initials: readonly string[]; status: React.ReactNode }) {
  return (
    <Card className="flex items-center gap-3">
      <DateTile start={start} zone={zone} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="block truncate font-semibold">{title}</span>
        <span className="block truncate text-[15px] text-muted">{when}</span>
        {status}
      </span>
      <Initials letters={initials} />
    </Card>
  );
}

const whenWhere = (start: Date | null, end: Date | null, zone: string, placeName: string | null) =>
  `${start && end ? formatTimeRange(start, end, zone) : enCA.home.noTime} · ${placeName ?? enCA.home.noPlace}`;

/** One of the parent's own playdates: what, when, where, and its KD-13 status. */
function PlaydateItem({ playdate: p, status }: { playdate: HomePlaydate; status: HomeStatus }) {
  const { answered, total } = answeredCount(p.inviteCount, p.answers.length);
  const line =
    status.kind === "needs_you" ? (
      <HomeStatusLine tone="needs_you">
        {status.why === "times_picked" ? enCA.home.needsYou.times_picked(p.answers.filter((a) => a.kind === "pick").length) : enCA.home.needsYou[status.why]}
      </HomeStatusLine>
    ) : status.kind === "upcoming" ? (
      <HomeStatusLine tone="success">{enCA.home.confirmed}</HomeStatusLine>
    ) : (
      <HomeStatusLine tone="muted">{enCA.home.answered(answered, total)}</HomeStatusLine>
    );
  return (
    <Link href={`/playdates/${p.id}`} className={itemLink}>
      <Row start={p.start} zone={p.timezone} title={p.title} when={whenWhere(p.start, p.end, p.timezone, p.placeName)} initials={p.friendInitials} status={line} />
    </Link>
  );
}

/** "Alex invited Mia": what, when, where, and this parent's own answer (T15). Waiting for your answer needs them. */
function InviteItem({ invite: i, childName }: { invite: HomeInvite; childName: string | null }) {
  const answer = i.myAnswer ? enCA.home.myAnswer[i.myAnswer] : enCA.home.myAnswer.waiting;
  const text = `${answer}${i.confirmed ? ` · ${enCA.status.confirmed}` : ""}`;
  const when = i.start && i.end ? formatTimeRange(i.start, i.end, i.zone) : enCA.home.pickATime;
  return (
    <Link href={`/invites/${i.inviteId}`} className={itemLink}>
      <Row
        start={i.start}
        zone={i.zone}
        title={enCA.home.invitedBy(i.organizerFirstName, childName)}
        when={`${when}${i.placeName ? ` · ${i.placeName}` : ""}`}
        initials={[i.organizerFirstName.trim()[0]?.toUpperCase() ?? "?"]}
        status={<HomeStatusLine tone={!i.myAnswer ? "needs_you" : i.myAnswer === "no" ? "danger" : "success"}>{text}</HomeStatusLine>}
      />
    </Link>
  );
}
