import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { NumberedStep } from "@/components/NumberedStep";
import { FriendStatusLine, StatusLine } from "@/components/StatusLine";
import { TextButtons, type TextButton } from "@/components/TextButtons";
import { directionsHref } from "@/components/invite/InvitePage";
import type { OrganizerPlaydate, PlaydatePageView } from "@/lib/domain/playdate-page";
import { enCA, formatDuration, formatShortDay, formatTimeRange } from "@/lib/i18n/en-CA";
import { durationMinutes } from "@/lib/rules/plan";
import { CancelButton } from "./CancelButton";
import { ConfirmButton } from "./ConfirmButton";

const t = enCA.playdate;

/**
 * The organizer's playdate page (DESIGN.md "Screens"): the Plan layout with 1 Who's invited (status per friend, KD-08), 2 When
 * (who can come and Confirm and send update, KD-09), 3 Where, Details. `live` is the "· Live" marker; `texts` the confirmation's
 * Text buttons once confirmed.
 */
export function PlaydatePage({ playdate: p, view, live, texts }: { playdate: OrganizerPlaydate; view: PlaydatePageView; live: React.ReactNode; texts: TextButton[] }) {
  const zone = p.timezone;
  return (
    <div className="flex flex-col gap-6 pb-6">
      <header className="flex flex-col gap-1">
        <Link href="/" className="-ml-2 flex min-h-11 w-fit items-center px-2 text-[15px] font-semibold text-primary">
          ← {t.back}
        </Link>
        <h1 className="text-title font-bold leading-tight">{p.title}</h1>
        {view.cancelled && <StatusLine tone="danger">{t.cancelled}</StatusLine>}
      </header>

      {view.cancelled && texts.length > 0 && (
        <section aria-label={t.cancelledNote} className="flex flex-col gap-3">
          <p className="text-[15px] text-muted">{t.cancelledNote}</p>
          <TextButtons texts={texts} />
        </section>
      )}

      {view.confirmed && (
        <section aria-labelledby="update-sent" className="flex flex-col gap-3">
          <h2 id="update-sent" className="text-lg font-semibold text-success">
            {t.updateSent}
          </h2>
          <p className="text-[15px] text-muted">{t.updateNote}</p>
          <TextButtons texts={texts} />
          <a
            href={`/playdates/${p.id}/calendar.ics`}
            className="inline-flex h-[50px] w-full items-center justify-center rounded-button bg-primary-tint px-5 text-base font-semibold text-primary"
          >
            {enCA.invite.addToCalendar}
          </a>
        </section>
      )}

      <NumberedStep number={1} done={view.total > 0 && view.answered === view.total} title={t.whoTitle}>
        <p className="text-[15px] text-muted">
          {t.answered(view.answered, view.total)}
          {live}
        </p>
        <ul className="mt-2 flex flex-col gap-2">
          {view.friends.map((f) => (
            <li key={f.inviteId} className="rounded-card bg-card px-4 py-3 shadow-card">
              <p className="font-semibold">{f.label}</p>
              <FriendStatusLine status={f.status} />
              {f.note && <p className="mt-1 text-[15px] text-muted">“{f.note}”</p>}
            </li>
          ))}
        </ul>
      </NumberedStep>

      <NumberedStep number={2} done={view.confirmed} title={t.whenTitle}>
        <div className="mt-2 flex flex-col gap-3">
          {view.start && view.end && (
            <p className="font-semibold">
              {formatShortDay(view.start, zone)} · {formatTimeRange(view.start, view.end, zone)} · {formatDuration(durationMinutes({ start: view.start, end: view.end }))}
            </p>
          )}
          {view.confirmed ? (
            <StatusLine tone="success">{t.confirmed}</StatusLine>
          ) : view.cancelled ? null : (
            <>
              <p className="text-[15px]">{view.comingNames.length ? t.canCome(view.comingNames) : t.nobodyYet}</p>
              <ConfirmButton playdateId={p.id} enabled={view.canConfirm} />
            </>
          )}
        </div>
      </NumberedStep>

      <NumberedStep number={3} done={!!p.placeName} title={t.whereTitle}>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">{p.placeName ?? enCA.home.noPlace}</p>
            {p.placeAddress && <p className="text-[15px] text-muted">{p.placeAddress}</p>}
          </div>
          {p.placeName && (
            <a
              href={directionsHref(p.placeName, p.placeAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 shrink-0 items-center rounded-button bg-primary-tint px-4 text-[15px] font-semibold text-primary"
            >
              {enCA.invite.directions}
            </a>
          )}
        </div>
      </NumberedStep>

      <section aria-labelledby="details-title" className="flex flex-col gap-2">
        <h2 id="details-title" className="text-lg font-semibold">
          {t.detailsTitle}
        </h2>
        <Card>
          <p className="text-label font-semibold uppercase tracking-wider text-muted">{t.messageLabel}</p>
          <p className="mt-1 whitespace-pre-wrap break-words">{p.message}</p>
        </Card>
      </section>

      {!view.cancelled && (
        <div className="flex flex-col gap-3">
          <ButtonLink href={`/playdates/${p.id}/edit`} fullWidth>
            {t.edit}
          </ButtonLink>
          <CancelButton playdateId={p.id} />
        </div>
      )}
    </div>
  );
}
