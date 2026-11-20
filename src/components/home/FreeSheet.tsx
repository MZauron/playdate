"use client";

import { useActionState, useRef, useState } from "react";
import { clearFreeAction, setFreeAction, type FreeState } from "@/app/(app)/free-actions";
import { enCA } from "@/lib/i18n/en-CA";
import { freeOptions, type FreeKind } from "@/lib/rules/free";
import { Button } from "../Button";
import { Chip } from "../Chip";
import { Field } from "../Field";
import { StatusLine } from "../StatusLine";
import { Avatar } from "../friends/Avatar";

export type FreeKid = { id: string; firstName: string; status: { kind: FreeKind; words: string | null } | null };

const t = enCA.free;

/**
 * T45 (KD-19, Q31): the Home banner's Free to play line and its sheet, one row per child: Share / Change, the times that are still
 * ahead (from the rules, on the parent's own clock), own words, Turn off. Nothing is sent; friends see it when they open Kindred.
 */
export function FreeSheet({ kids, label, anyFree }: { kids: readonly FreeKid[]; label: string; anyFree: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [clock, setClock] = useState<{ now: Date; zone: string } | null>(null);
  const open = () => {
    setClock({ now: new Date(), zone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    dialog.current?.showModal();
  };
  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        className="relative mt-2 flex min-h-11 max-w-full items-center gap-2 rounded-full bg-white/15 px-3.5 text-left text-[14px] font-semibold focus-visible:outline-2 focus-visible:outline-white"
      >
        {anyFree ? <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-[#7CE0A8]" /> : <span aria-hidden="true">☀️</span>}
        <span className="min-w-0 truncate">{label}</span>
        <span aria-hidden="true">›</span>
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="free-title"
        className="mx-auto mb-0 mt-auto w-full max-w-[480px] rounded-t-[28px] bg-page p-0 text-ink backdrop:bg-black/40"
      >
        <div className="flex flex-col gap-4 px-4 pb-6 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="free-title" className="text-xl font-extrabold tracking-tight">
                {t.title}
              </h2>
              <p className="text-[15px] text-muted">{t.sheetNote}</p>
            </div>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label={t.close}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-fill text-lg focus-visible:outline-2 focus-visible:outline-primary"
            >
              ✕
            </button>
          </div>
          <ul className="flex flex-col gap-3">
            {kids.map((kid) => (
              <li key={kid.id}>
                <KidRow kid={kid} options={clock ? freeOptions(clock.now, clock.zone) : []} zone={clock?.zone ?? ""} />
              </li>
            ))}
          </ul>
          <p className="text-[14px] text-muted">{t.privacy}</p>
        </div>
      </dialog>
    </>
  );
}

function KidRow({ kid, options, zone }: { kid: FreeKid; options: readonly string[]; zone: string }) {
  const [state, setAction, setting] = useActionState<FreeState, FormData>(setFreeAction, {});
  const [offState, offAction, turningOff] = useActionState<FreeState, FormData>(clearFreeAction, {});
  const [words, setWords] = useState(kid.status?.kind === "own_words" ? (kid.status.words ?? "") : "");
  // The row is open at a count of saves; a save moves the count on, which closes it.
  const saved = (state.saved ?? 0) + (offState.saved ?? 0);
  const [openAt, setOpenAt] = useState<number | null>(null);
  const open = openAt === saved;
  const error = state.error ?? offState.error;
  return (
    <div className="flex flex-col gap-3 rounded-card bg-card p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span className="relative">
          <Avatar name={kid.firstName} size={40} />
          {kid.status && <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-success ring-2 ring-card" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{kid.firstName}</span>
          <span className="block truncate text-[14px] text-muted">{kid.status ? t.status(kid.firstName, kid.status.kind, kid.status.words) : t.notSet}</span>
        </span>
        <Button
          compact
          aria-expanded={open}
          aria-label={kid.status ? t.changeFor(kid.firstName) : t.shareFor(kid.firstName)}
          onClick={() => setOpenAt(open ? null : saved)}
        >
          {kid.status ? t.change : t.share}
        </Button>
      </div>
      {open && (
        <>
          <form action={setAction} aria-label={t.whenLabel(kid.firstName)} className="flex flex-wrap gap-2">
            <input type="hidden" name="childId" value={kid.id} />
            <input type="hidden" name="zone" value={zone} />
            {options.map((when) => (
              <Chip key={when} type="submit" name="when" value={when} selected={kid.status?.kind === when} disabled={setting}>
                {t.whens[when as keyof typeof t.whens]}
              </Chip>
            ))}
          </form>
          <form action={setAction} className="flex items-end gap-2">
            <input type="hidden" name="childId" value={kid.id} />
            <input type="hidden" name="zone" value={zone} />
            <input type="hidden" name="when" value="own_words" />
            <div className="min-w-0 flex-1">
              <Field
                id={`free-words-${kid.id}`}
                name="words"
                label={t.ownWordsLabel}
                placeholder={t.ownWordsPlaceholder}
                value={words}
                onChange={(e) => setWords(e.target.value)}
                maxLength={50}
                autoComplete="off"
                required
              />
            </div>
            <Button type="submit" disabled={setting}>
              {setting ? t.saving : t.save}
            </Button>
          </form>
          {kid.status && (
            <form action={offAction}>
              <input type="hidden" name="childId" value={kid.id} />
              <Button type="submit" variant="destructive" compact disabled={turningOff}>
                {t.turnOff}
              </Button>
            </form>
          )}
        </>
      )}
      {error && (
        <StatusLine tone="danger" role="alert">
          {error}
        </StatusLine>
      )}
    </div>
  );
}
