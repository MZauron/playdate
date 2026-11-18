import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { enCA, formatDateTile, formatShortDay, formatTimeRange } from "@/lib/i18n/en-CA";
import type { PlaydateTogether } from "@/lib/db/friends";
import type { Friend } from "@/lib/domain/friends";
import { Avatar } from "./Avatar";
import { FriendRow } from "./FriendRow";

const t = enCA.friends.page;

/**
 * T40: initials, the label, has Kindred or gets a text, Plan a playdate with Dev (coral), the playdates together (open ones, then
 * past ones with Plan again), and Rename / Remove. Everything here is the owner's own; nothing from the friend's account (KD-17).
 */
export function FriendPage({ friend, open, past }: { friend: Friend; open: readonly PlaydateTogether[]; past: readonly PlaydateTogether[] }) {
  const firstName = friend.parentName.trim().split(/\s+/)[0] ?? friend.parentName;
  return (
    <div className="flex flex-col gap-6 pb-6">
      <Link href="/friends" className="-ml-2 flex min-h-11 w-fit items-center px-2 text-[15px] font-semibold text-primary">
        ← {enCA.friends.tabTitle}
      </Link>
      <Card className="flex flex-col items-center px-4 py-6 text-center">
        <Avatar name={friend.parentName} size={72} />
        <h1 className="mt-3 text-[22px] font-extrabold tracking-tight">{friend.parentName}</h1>
        <p className="text-[15px] text-muted">{friend.label}</p>
        <span
          className={
            friend.hasKindred
              ? "mt-3 rounded-full bg-primary-tint px-3 py-1 text-[13px] font-bold text-primary"
              : "mt-3 rounded-full bg-page px-3 py-1 text-[13px] font-bold text-muted"
          }
        >
          {friend.hasKindred ? enCA.friends.hasKindred : enCA.friends.getsText}
        </span>
        {!friend.hasKindred && <p className="mt-2 text-[14px] text-muted">{t.textNote}</p>}
      </Card>

      <ButtonLink href={`/plan?friend=${friend.id}`} variant="main" fullWidth>
        {t.plan(firstName)}
      </ButtonLink>

      <section aria-labelledby="together-title">
        <h2 id="together-title" className="mb-2 px-1 text-label font-bold uppercase tracking-wider text-muted">
          {t.together}
        </h2>
        {open.length + past.length === 0 ? (
          <p className="px-1 text-[15px] text-muted">{t.none}</p>
        ) : (
          <Card className="px-4 py-1">
            <ul>
              {open.map((p) => (
                <li key={p.id} className="border-line [&+&]:border-t">
                  <Link href={`/playdates/${p.id}`} className="flex min-h-16 items-center gap-3 py-2.5 focus-visible:outline-2 focus-visible:outline-primary">
                    <Tile p={p} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{p.title.replace(/^Playdate:\s*/, "")}</span>
                      <span className="block truncate text-[14px] text-muted">
                        {p.confirmed ? t.confirmed : t.waiting}
                        {p.placeName ? ` · ${p.placeName}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
              {past.map((p) => (
                <li key={p.id} className="flex items-center gap-3 border-page py-2.5 [&+&]:border-t">
                  <Tile p={p} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{p.placeName ?? p.title.replace(/^Playdate:\s*/, "")}</span>
                    <span className="block truncate text-[14px] text-muted">{p.start && p.end ? formatTimeRange(p.start, p.end, p.timezone) : ""}</span>
                  </span>
                  <Link
                    href={`/plan?again=${p.id}`}
                    aria-label={`${t.planAgain}: ${p.start ? formatShortDay(p.start, p.timezone) : ""}`}
                    className="flex min-h-11 shrink-0 items-center rounded-full bg-primary-tint px-3.5 text-[14px] font-bold text-primary focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {t.planAgain}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section aria-labelledby="manage-title">
        <h2 id="manage-title" className="mb-2 px-1 text-label font-bold uppercase tracking-wider text-muted">
          {t.manage}
        </h2>
        <FriendRow friend={friend} afterRemove="/friends" />
      </section>
    </div>
  );
}

function Tile({ p }: { p: PlaydateTogether }) {
  const tile = p.start ? formatDateTile(p.start, p.timezone) : null;
  return (
    <span aria-hidden="true" className="flex h-[52px] w-[46px] shrink-0 flex-col items-center justify-center rounded-xl bg-page">
      {tile ? (
        <>
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted">{tile.month}</span>
          <span className="text-[19px] font-extrabold leading-none">{tile.day}</span>
        </>
      ) : (
        <span className="text-xl font-bold text-primary">?</span>
      )}
    </span>
  );
}
