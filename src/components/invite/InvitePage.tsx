import { Card } from "@/components/Card";
import { StatusLine } from "@/components/StatusLine";
import type { InviteView } from "@/lib/domain/invite-page";
import { enCA, formatDateTile, formatShortDay, formatTimeRange } from "@/lib/i18n/en-CA";
import { AnswerPanel } from "./AnswerPanel";
import { InviteShell } from "./InviteShell";
import { LocalTime } from "./LocalTime";

const t = enCA.invite;

/** Directions open the phone's maps in a new tab; the page sends no referrer, so the link stays private. */
export function directionsHref(placeName: string, placeAddress: string | null): string {
  const query = placeAddress ? `${placeName}, ${placeAddress}` : placeName;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** The invite page (DESIGN.md "Screens"): who invites, the message as a bubble, the details card, and the answer. */
export function InvitePage({ view, token }: { view: InviteView; token: string }) {
  if (view.state === "over") {
    return (
      <InviteShell>
        <h1 className="text-title font-bold leading-tight">{t.overTitle}</h1>
        <p className="text-muted">{view.title}</p>
        <p className="text-muted">{t.overNote}</p>
      </InviteShell>
    );
  }

  const tile = view.start ? formatDateTile(view.start, view.zone) : null;
  return (
    <InviteShell>
      <header className="flex items-center gap-3">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-tint text-lg font-bold text-primary">
          {view.organizerFirstName.trim()[0]?.toUpperCase() ?? "?"}
        </span>
        <p className="font-semibold">{t.from(view.organizerFirstName, view.organizerChild)}</p>
      </header>

      <div className="flex flex-col gap-2">
        {view.label !== "none" && <p className="text-label font-semibold uppercase tracking-wider text-purple">{t.labels[view.label]}</p>}
        <h1 className="text-title font-bold leading-tight">{view.title}</h1>
      </div>

      <p className="whitespace-pre-wrap break-words rounded-card rounded-tl-md bg-card px-4 py-3 shadow-card">{view.message}</p>
      {view.confirmed && view.start && view.end && (
        <p className="rounded-card rounded-tl-md bg-success/10 px-4 py-3 font-medium text-success">
          {enCA.itsOn(formatShortDay(view.start, view.zone), formatTimeRange(view.start, view.end, view.zone), view.placeName)}
        </p>
      )}

      <Card className="flex flex-col gap-4 overflow-hidden">
        {view.confirmed && (
          <p className="-mx-4 -mt-4 bg-success px-4 py-2 text-label font-bold uppercase tracking-wider text-white">{t.confirmedBand}</p>
        )}
        <div className="flex items-center gap-4">
          {tile && (
            <div aria-hidden="true" className="flex size-14 shrink-0 flex-col items-center justify-center rounded-button bg-accent-tint text-accent">
              <span className="text-label font-semibold uppercase">{tile.month}</span>
              <span className="text-xl font-bold leading-none">{tile.day}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-label font-semibold uppercase tracking-wider text-muted">{t.whenLabel}</p>
            {view.start && view.end ? <LocalTime start={view.start} end={view.end} zone={view.zone} /> : <p className="font-semibold">{t.timeToDecide}</p>}
          </div>
        </div>
        <div className="flex items-start justify-between gap-3 border-t border-black/5 pt-4">
          <div className="min-w-0">
            <p className="text-label font-semibold uppercase tracking-wider text-muted">{t.whereLabel}</p>
            <p className="font-semibold">{view.placeName ?? t.placeToDecide}</p>
            {view.placeAddress && <p className="text-[15px] text-muted">{view.placeAddress}</p>}
          </div>
          {view.placeName && (
            <a
              href={directionsHref(view.placeName, view.placeAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 shrink-0 items-center rounded-button bg-primary-tint px-4 text-[15px] font-semibold text-primary"
            >
              {t.directions}
            </a>
          )}
        </div>
      </Card>

      {view.confirmed && view.state !== "cancelled" && (
        <a
          href={`/r/${token}/calendar.ics`}
          className="inline-flex h-[50px] w-full items-center justify-center rounded-button bg-primary-tint px-5 text-base font-semibold text-primary"
        >
          {t.addToCalendar}
        </a>
      )}

      {view.state === "cancelled" ? (
        <StatusLine tone="danger">{t.cancelled}</StatusLine>
      ) : view.state === "started" ? (
        <StatusLine tone="muted">{t.started}</StatusLine>
      ) : (
        <AnswerPanel
          token={token}
          timeVersion={view.timeVersion}
          answer={view.answer}
          zone={view.zone}
          // Availability (T13): friends pick a time inside the organizer's free slots (still, once confirmed: KD-07n).
          availability={view.mode === "availability" ? { organizerFirstName: view.organizerFirstName, zone: view.zone, slots: view.slots, picks: view.picks } : undefined}
        />
      )}
    </InviteShell>
  );
}
