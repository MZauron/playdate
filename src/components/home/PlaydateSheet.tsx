"use client";

import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";
import { cancelAction, confirmAction, type ConfirmState } from "@/app/(app)/playdates/[id]/actions";
import { Button, ButtonLink } from "@/components/Button";
import { enCA } from "@/lib/i18n/en-CA";

const t = enCA.home.sheet;

/** What the sheet's Confirm sends: the set time, or the availability time most families can make (T44); off until it may confirm. */
export type SheetConfirm = { label: string; enabled: boolean; hint?: string; chosen?: { start: string; end: string } };

/**
 * T50 (KD-09 unchanged): tapping one of the parent's own playdates on Home opens a sheet: the title, when, each family's answer,
 * Confirm · time, Edit playdate, Cancel playdate (asks first) and Open playdate. Confirm and Cancel are the playdate page's own actions;
 * after either, the playdate page opens, where the texts to share are.
 */
export function PlaydateSheet({
  id,
  title,
  when,
  families,
  confirm,
  children,
}: {
  id: string;
  title: string;
  when: string;
  families: readonly { name: string; state: string }[];
  /** null once confirmed. */
  confirm: SheetConfirm | null;
  /** The Home card, which opens the sheet. */
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  // The sheet's inside is drawn once it is first opened, so Home's page stays one list with one coral action until then.
  const [shown, setShown] = useState(false);
  const thenOpen = (act: typeof confirmAction) => async (previous: ConfirmState, form: FormData) => {
    const result = await act(previous, form);
    if (!result.error) router.push(`/playdates/${id}`);
    return result;
  };
  const [confirmState, confirmIt, confirming] = useActionState<ConfirmState, FormData>(thenOpen(confirmAction), {});
  const [cancelState, cancelIt, cancelling] = useActionState<ConfirmState, FormData>(thenOpen(cancelAction), {});
  const error = confirmState.error ?? cancelState.error;
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setAsking(false);
          setShown(true);
          dialog.current?.showModal();
        }}
        className="block w-full rounded-card text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {children}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={`sheet-${id}`}
        className="mx-auto mb-0 mt-auto w-full max-w-[480px] rounded-t-[28px] bg-page p-0 text-ink backdrop:bg-black/40"
      >
        {shown && (
        <div className="flex flex-col gap-4 px-4 pb-6 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={`sheet-${id}`} className="text-xl font-extrabold tracking-tight">
                {title}
              </h2>
              <p className="text-[15px] text-muted">{when}</p>
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
          <ul className="flex flex-col gap-1 rounded-card bg-card px-4 py-3 shadow-card text-[15px]">
            {families.map((f, i) => (
              <li key={i}>{t.family(f.name, f.state)}</li>
            ))}
          </ul>
          {error && (
            <p role="alert" className="text-[15px] font-medium text-danger">
              {error}
            </p>
          )}
          {asking ? (
            <form action={cancelIt} className="flex flex-col gap-3 rounded-card bg-card p-4 shadow-card">
              <input type="hidden" name="playdateId" value={id} />
              <p className="font-bold">{enCA.playdate.cancelAsk}</p>
              <p className="text-[15px] text-muted">{enCA.playdate.cancelNote}</p>
              <Button type="submit" variant="destructive" fullWidth disabled={cancelling}>
                {t.cancelYes}
              </Button>
              <Button fullWidth onClick={() => setAsking(false)}>
                {enCA.playdate.keepPlaydate}
              </Button>
            </form>
          ) : (
            <>
              {confirm && (
                <form action={confirmIt} className="flex flex-col gap-2">
                  <input type="hidden" name="playdateId" value={id} />
                  {confirm.chosen && (
                    <>
                      <input type="hidden" name="chosenStart" value={confirm.chosen.start} />
                      <input type="hidden" name="chosenEnd" value={confirm.chosen.end} />
                    </>
                  )}
                  <Button type="submit" variant="main" fullWidth disabled={!confirm.enabled || confirming}>
                    {confirm.label}
                  </Button>
                  {!confirm.enabled && confirm.hint && <p className="text-[14px] text-muted">{confirm.hint}</p>}
                </form>
              )}
              <div className="flex gap-2">
                <ButtonLink href={`/playdates/${id}/edit`} className="flex-1">
                  {enCA.playdate.edit}
                </ButtonLink>
                <ButtonLink href={`/playdates/${id}`} className="flex-1">
                  {t.openPage}
                </ButtonLink>
              </div>
              <Button variant="destructive" fullWidth onClick={() => setAsking(true)}>
                {enCA.playdate.cancel}
              </Button>
            </>
          )}
        </div>
        )}
      </dialog>
    </>
  );
}
