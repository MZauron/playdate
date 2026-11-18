import { Card } from "@/components/Card";
import { ShareButton } from "@/components/ShareButton";
import { cx } from "@/components/cx";
import { dayPartOf, enCA, formatDateTile, formatLongDay, formatTimeRange, formatWeekday, joinNames } from "@/lib/i18n/en-CA";
import Link from "next/link";
import type { MajorityNotice } from "@/lib/domain/majority";
import type { HomeInvite } from "@/lib/db/invites";
import type { RecentPlaydate } from "@/lib/db/playdates";
import type { HomeStatus } from "@/lib/rules/home";
import type { AnswerKind } from "@/lib/rules/types";
import { homeList, type HomePlaydate } from "./home-data";
import { Kite } from "./Kite";

export type HomeViewProps = {
  /** The signed-in parent's first name; the banner says "Welcome, Alex" the first time (`welcome`), and the host chip uses it. */
  firstName?: string;
  welcome?: boolean;
  /** Q4 default: invites name the family's first child ("Alex invited Mia"). */
  childName?: string;
  /** Every child's first name, for the banner's line ("Plan playdates for Mia and Ethan."). Defaults to `childName`. */
  childNames?: readonly string[];
  playdates: readonly HomePlaydate[];
  /** KD-12, Q2 default: text friends to tell that most families picked another time (under that playdate's card). */
  notices?: readonly MajorityNotice[];
  /** T15: invites from other Kindred parents, opened at /invites/[id]. */
  invites?: readonly HomeInvite[];
  /** T38: the parent's last confirmed playdates that are over, each with Plan again. */
  recent?: readonly RecentPlaydate[];
  now: Date;
  /** The zone for the banner's date and greeting. */
  zone: string;
  /** T43: the Or just say it box, under the Plan card (above the list once it has something). Passed in: it holds a server action. */
  sayIt?: React.ReactNode;
};

// T37 (Q29): Home in the tester's mock-up look. What is on Home and its order are still KD-13 (src/lib/rules/home.ts).
export function HomeView({ firstName, welcome = false, childName, childNames, playdates, notices = [], invites = [], recent = [], now, zone, sayIt }: HomeViewProps) {
  const items = homeList(playdates, invites, now);
  const greeting = welcome && firstName ? enCA.home.welcome(firstName) : enCA.home.greeting[dayPartOf(now, zone)];
  const kids = childNames?.length ? childNames : childName ? [childName] : [];

  return (
    <div className="flex flex-col gap-5 pb-6">
      <header className="relative overflow-hidden rounded-[28px] bg-primary px-5 pb-5 pt-4 text-white">
        <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 size-48 rounded-full bg-white/[0.07]" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-14 size-44 rounded-full bg-white/5" />
        <p className="relative text-[14px] opacity-85">{formatLongDay(now, zone)}</p>
        <h1 className="relative mt-1 text-[28px] font-extrabold leading-tight tracking-tight">{greeting}</h1>
        {kids.length > 0 && <p className="relative mt-1 text-[15px] opacity-90">{enCA.home.planFor(joinNames(kids))}</p>}
        <Kite className="absolute right-4 top-3 h-20 w-14 opacity-95" />
      </header>

      {items.length === 0 ? (
        <>
          <Link
            href="/plan"
            className="flex min-h-[72px] items-center gap-4 rounded-card bg-card p-4 shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-accent text-2xl font-bold leading-none text-white">
              +
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold tracking-tight">{enCA.home.planCard}</span>
              <span className="block text-[14px] text-muted">{enCA.home.emptyNote}</span>
            </span>
            <Chevron />
          </Link>
          {sayIt}
        </>
      ) : (
        /* KD-13 (Q24): one list, soonest first, the parent's own playdates and the invites they received together. */
        <>
          {sayIt}
          <section aria-labelledby="home-list-title">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <h2 id="home-list-title" className="text-label font-bold uppercase tracking-wider text-muted">
                {enCA.home.listTitle}
              </h2>
              <Link
                href="/plan"
                className="flex min-h-11 items-center gap-1 rounded-full bg-accent px-3.5 text-[14px] font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  +
                </span>
                {enCA.home.planAnother}
              </Link>
            </div>
            <ul className="flex flex-col gap-3">
              {items.map((item) =>
                item.kind === "invite" ? (
                  <li key={`i-${item.invite.inviteId}`}>
                    <InviteItem invite={item.invite} childName={childName ?? null} />
                  </li>
                ) : (
                  <li key={item.playdate.id} className="flex flex-col gap-2">
                    <PlaydateItem playdate={item.playdate} status={item.status} hostName={firstName ?? null} />
                    {notices
                      .filter((n) => n.playdateId === item.playdate.id)
                      .map((n) => (
                        <Card key={n.inviteId} className="flex items-center justify-between gap-3">
                          <p className="min-w-0 text-[15px] font-medium">{enCA.home.majorityNotice(n.name, n.rangeText)}</p>
                          <ShareButton text={n.body} name={n.name} />
                        </Card>
                      ))}
                  </li>
                ),
              )}
            </ul>
          </section>
        </>
      )}

      {recent.length > 0 && (
        <section aria-labelledby="home-recent-title">
          <h2 id="home-recent-title" className="mb-2 px-1 text-label font-bold uppercase tracking-wider text-muted">
            {enCA.home.recentTitle}
          </h2>
          <Card className="px-4 py-1">
            <ul>
              {recent.map((r) => (
                <li key={r.id} className="flex items-center gap-3 border-page py-3 [&+&]:border-t">
                  <DateTile start={r.start} zone={r.timezone} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold tracking-tight">{r.title.replace(/^Playdate:\s*/, "")}</span>
                    {r.placeName && <span className="block truncate text-[14px]">{r.placeName}</span>}
                    <span className="block text-[14px] text-muted">{formatTimeRange(r.start, r.end, r.timezone)}</span>
                  </span>
                  <Link
                    href={`/plan?again=${r.id}`}
                    className="flex min-h-11 shrink-0 items-center rounded-full bg-primary-tint px-3.5 text-[14px] font-bold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {enCA.home.planAgain}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}

const itemLink = "block rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function Chevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 text-muted/70" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

/** The date tile, or a calendar icon while the time is still to be decided, so every card lines up. */
function DateTile({ start, zone }: { start: Date | null; zone: string }) {
  const tile = start ? formatDateTile(start, zone) : null;
  return (
    <span aria-hidden="true" className="flex h-[52px] w-[46px] shrink-0 flex-col items-center justify-center rounded-xl bg-page text-ink">
      {tile ? (
        <>
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted">{tile.month}</span>
          <span className="text-[19px] font-extrabold leading-none">{tile.day}</span>
        </>
      ) : (
        <svg viewBox="0 0 24 24" className="size-[22px] text-primary" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      )}
    </span>
  );
}

function Tag({ confirmed }: { confirmed: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex w-fit rounded-full px-2.5 py-0.5 text-[11.5px] font-extrabold uppercase tracking-wide",
        confirmed ? "bg-success-tint text-success" : "bg-warn-tint text-warn",
      )}
    >
      {confirmed ? enCA.home.tag.confirmed : enCA.home.tag.pending}
    </span>
  );
}

type ChipState = AnswerKind | "waiting";
const chipTone: Record<ChipState, string> = {
  yes: "bg-success-tint text-success",
  pick: "bg-success-tint text-success",
  no: "bg-danger-tint text-danger",
  waiting: "bg-page text-muted",
};
const markTone: Record<ChipState, string> = {
  yes: "bg-success text-white",
  pick: "bg-success text-white",
  no: "bg-danger text-white",
  waiting: "border-[1.5px] border-dashed border-muted/50",
};

/** One family: ✓ green, ✕ red, a dashed circle while waiting; the state in words for screen readers. */
function FamilyChip({ name, state }: { name: string; state: ChipState }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[12.5px] font-bold", chipTone[state])}>
      <span aria-hidden="true" className={cx("flex size-4 items-center justify-center rounded-full text-[10px] font-extrabold", markTone[state])}>
        {state === "no" ? "✕" : state === "waiting" ? "" : "✓"}
      </span>
      {name}
      <span className="sr-only"> {enCA.home.chipState[state]}</span>
    </span>
  );
}

function HostChip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full bg-primary-tint px-2.5 py-1 text-[12.5px] font-bold text-primary">{children}</span>;
}

/** The note under a card: green when it is ready for the parent, red when something went wrong. */
function Note({ tone, children }: { tone: "ready" | "warn"; children: React.ReactNode }) {
  return (
    <p className={cx("mt-3 rounded-[10px] px-2.5 py-1.5 text-[13px] font-bold", tone === "ready" ? "bg-success-tint text-success" : "bg-danger-tint text-danger")}>
      {children}
    </p>
  );
}

function SlimCard({
  start,
  zone,
  confirmed,
  title,
  when,
  place,
  chips,
  note,
}: {
  start: Date | null;
  zone: string;
  confirmed: boolean;
  title: string;
  when: string;
  place: string | null;
  chips: React.ReactNode;
  note: React.ReactNode;
}) {
  return (
    <Card className="px-4 py-3.5">
      <span className="flex items-center gap-3">
        <DateTile start={start} zone={zone} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <Tag confirmed={confirmed} />
          <span className="block text-base font-bold tracking-tight">{title}</span>
        </span>
        <Chevron />
      </span>
      <span className="mt-3 grid gap-1.5 border-t border-line pt-3 text-[14px]">
        <span className="flex min-w-0 items-center gap-2">
          <ClockIcon />
          <span className="truncate">{when}</span>
        </span>
        <span className="flex min-w-0 items-start gap-2">
          <PinIcon />
          {place ? <span className="min-w-0">{place}</span> : <span className="text-muted">{enCA.home.noPlace}</span>}
        </span>
      </span>
      <span className="mt-2.5 flex flex-wrap gap-1.5">{chips}</span>
      {note}
    </Card>
  );
}

const whenLine = (start: Date | null, end: Date | null, zone: string, unset: string) =>
  start && end ? `${formatWeekday(start, zone)} · ${formatTimeRange(start, end, zone)}` : unset;

/** One of the parent's own playdates: tag, title, when, where, a chip per family, and a note when it needs them (KD-13). */
function PlaydateItem({ playdate: p, status, hostName }: { playdate: HomePlaydate; status: HomeStatus; hostName: string | null }) {
  const picks = p.families.filter((f) => f.answer === "pick").length;
  const note =
    status.kind !== "needs_you" ? null : status.why === "changed_to_no" ? (
      <Note tone="warn">{enCA.home.needsYou.changed_to_no}</Note>
    ) : (
      <Note tone="ready">{status.why === "times_picked" ? enCA.home.needsYou.times_picked(picks) : enCA.home.needsYou.all_answered}</Note>
    );
  return (
    <Link href={`/playdates/${p.id}`} className={itemLink}>
      <SlimCard
        start={p.start}
        zone={p.timezone}
        confirmed={p.status === "confirmed"}
        title={p.title.replace(/^Playdate:\s*/, "")}
        when={whenLine(p.start, p.start ? p.end : null, p.timezone, p.mode === "availability" ? enCA.home.sharedAvailability : enCA.home.noTime)}
        place={p.placeName}
        chips={
          <>
            {hostName && <HostChip>{enCA.home.hostChip(hostName, true)}</HostChip>}
            {p.families.map((f, i) => (
              <FamilyChip key={i} name={f.name} state={f.answer ?? "waiting"} />
            ))}
          </>
        }
        note={note}
      />
    </Link>
  );
}

/** "Alex invited Mia": tag, when, where, the host and this parent's own answer (T15); waiting for their answer needs them. */
function InviteItem({ invite: i, childName }: { invite: HomeInvite; childName: string | null }) {
  return (
    <Link href={`/invites/${i.inviteId}`} className={itemLink}>
      <SlimCard
        start={i.start}
        zone={i.zone}
        confirmed={i.confirmed}
        title={enCA.home.invitedBy(i.organizerFirstName, childName)}
        when={whenLine(i.start, i.end, i.zone, enCA.home.pickATime)}
        place={i.placeName}
        chips={
          <>
            <HostChip>{enCA.home.hostChip(i.organizerFirstName, false)}</HostChip>
            <FamilyChip name={enCA.home.youChip} state={i.myAnswer ?? "waiting"} />
          </>
        }
        note={i.myAnswer ? null : <Note tone="ready">{enCA.home.waitingForYou}</Note>}
      />
    </Link>
  );
}
