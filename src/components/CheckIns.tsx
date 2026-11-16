"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkInAction, type CheckInState } from "@/app/check-in-actions";
import { Card } from "./Card";
import { shareText } from "./share";
import type { CheckInPanel } from "@/lib/domain/check-ins";
import { enCA, formatTime } from "@/lib/i18n/en-CA";
import { CHECKIN_KINDS } from "@/lib/rules/checkins";
import { CHECKIN_NOTE_MAX_LENGTH } from "@/lib/rules/config";

const t = enCA.checkIns;

/** Who is posting: the organizer (their playdate id), a friend through their link (token), or a Kindred friend (invite id). */
export type CheckInKey = { playdateId: string } | { token: string } | { inviteId: string };

/**
 * How it's going (T35, KD-18): the playdate's check-ins, newest first, by first name, and, while this viewer may post, the four
 * check-ins as big buttons with an optional note. After posting, Share it too sends it from the phone (the server sends nothing).
 * `postAs` is null in a preview. A friend's page has no live connection, so it reads itself again every 30 seconds while open.
 */
export function CheckIns({ panel, postAs, zone, refresh = false }: { panel: CheckInPanel; postAs: CheckInKey | null; zone: string; refresh?: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CheckInState, FormData>(checkInAction, {});
  const [note, setNote] = useState("");
  const [shared, setShared] = useState<{ for: number; result: "shared" | "copied" } | null>(null);
  const canPost = panel.canPost && postAs !== null;

  useEffect(() => {
    if (!refresh || !panel.canPost) return;
    const timer = setInterval(() => document.visibilityState === "visible" && router.refresh(), 30_000);
    return () => clearInterval(timer);
  }, [refresh, panel.canPost, router]);

  const [postedCount, setPostedCount] = useState(0);
  if ((state.posted ?? 0) !== postedCount) {
    setPostedCount(state.posted ?? 0);
    setNote("");
  }

  if (!canPost && panel.checkIns.length === 0) return null;
  return (
    <section aria-labelledby="checkins-title" className="flex flex-col gap-3">
      <h2 id="checkins-title" className="text-lg font-semibold">
        {t.title}
      </h2>
      {canPost && (
        <form action={action} className="flex flex-col gap-3">
          {"playdateId" in postAs && <input type="hidden" name="playdateId" value={postAs.playdateId} />}
          {"token" in postAs && <input type="hidden" name="token" value={postAs.token} />}
          {"inviteId" in postAs && <input type="hidden" name="inviteId" value={postAs.inviteId} />}
          <p className="text-[15px] text-muted">{t.hint}</p>
          <label htmlFor="checkin-note" className="-mb-2 text-[15px] font-semibold">
            {t.noteLabel}
          </label>
          <input
            id="checkin-note"
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={CHECKIN_NOTE_MAX_LENGTH}
            placeholder={t.notePlaceholder}
            autoComplete="off"
            className="h-12 rounded-button bg-card px-4 text-base shadow-card outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <div className="grid grid-cols-2 gap-2">
            {CHECKIN_KINDS.map((kind) => (
              <button
                key={kind}
                type="submit"
                name="kind"
                value={kind}
                disabled={pending}
                className="flex min-h-14 items-center justify-center rounded-button bg-card px-3 text-center text-[15px] font-semibold leading-tight shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
              >
                {t.kinds[kind]}
              </button>
            ))}
          </div>
          {state.error && (
            <p role="alert" className="text-[15px] font-medium text-danger">
              {state.error}
            </p>
          )}
          {state.text && !state.error && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p role="status" className="text-[15px] font-medium text-success">
                {t.posted}
              </p>
              <button
                type="button"
                onClick={async () => {
                  const result = await shareText(state.text!);
                  if (result !== "cancelled") setShared({ for: state.posted ?? 0, result: result === "copied" ? "copied" : "shared" });
                }}
                className="inline-flex min-h-11 items-center rounded-button bg-primary-tint px-4 text-[15px] font-semibold text-primary"
              >
                {shared && shared.for === state.posted ? (shared.result === "copied" ? t.copied : t.shared) : t.share}
              </button>
            </div>
          )}
        </form>
      )}
      {panel.checkIns.length === 0 ? (
        <p className="text-[15px] text-muted">{t.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {panel.checkIns.map((c) => (
            <li key={c.id}>
              <Card className="flex flex-col gap-0.5">
                <span className="text-label font-semibold uppercase tracking-wider text-muted">
                  {c.yours ? t.you : c.firstName} · {formatTime(c.at, zone)}
                </span>
                <span className="font-semibold">{t.kinds[c.kind]}</span>
                {c.note && <span className="break-words text-[15px]">{c.note}</span>}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
