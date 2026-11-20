"use client";

import { useState, useTransition } from "react";
import { newFriendLinkAction, stopFriendLinksAction } from "@/app/(app)/friends/actions";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { shareText } from "@/components/share";
import { enCA } from "@/lib/i18n/en-CA";
import { QrCode } from "./QrCode";

const t = enCA.friendLink;

/**
 * Invite to Kindred (T34, Q26). Two taps on purpose: Get my Kindred link asks the server for a new link, then Share my link opens the
 * phone's share sheet straight from the tap (a share sheet needs a fresh tap; it can't wait on the server). Stop my old links asks first.
 */
export function InviteToKindred() {
  const [url, setUrl] = useState<string | null>(null);
  const [shared, setShared] = useState<"no" | "shared" | "copied">("no");
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, start] = useTransition();
  const [qr, setQr] = useState(false);
  const makeLink = (then?: () => void) =>
    start(async () => {
      setNote(null);
      const result = await newFriendLinkAction();
      if (result.url) {
        setUrl(result.url);
        then?.();
      } else setNote({ text: result.error ?? t.failed, error: true });
    });

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-[15px] text-muted">{t.note}</p>
      {url ? (
        <>
          <p className="text-[15px] font-medium">{t.ready}</p>
          {/* Shown too, so it can be copied by hand where sharing isn't available. */}
          <p className="break-all rounded-button bg-page px-3 py-2 text-[15px] text-primary">{url}</p>
          <Button
            // Add friend is the screen's one coral action; this stays teal.
            variant="secondary"
            fullWidth
            onClick={async () => {
              const result = await shareText(t.shareText(url));
              if (result !== "cancelled") setShared(result === "copied" ? "copied" : "shared");
            }}
          >
            {shared === "no" ? t.share : shared === "copied" ? t.copied : t.shared}
          </Button>
        </>
      ) : (
        <Button fullWidth disabled={pending} onClick={() => makeLink()}>
          {t.make}
        </Button>
      )}
      {/* T52: the same link as a QR code; a new link is made first when none is shown yet. */}
      <Button fullWidth disabled={pending} aria-expanded={qr && !!url} onClick={() => (url ? setQr((q) => !q) : makeLink(() => setQr(true)))}>
        {qr && url ? t.hideQr : t.showQr}
      </Button>
      {qr && url && (
        <div className="flex flex-col items-center gap-2 rounded-card bg-white p-4 ring-1 ring-line">
          <QrCode text={url} label={t.qrLabel} />
          <p className="text-center text-[15px] text-muted">{t.qrNote}</p>
        </div>
      )}
      {asking ? (
        <div className="flex flex-col gap-2">
          <p className="font-medium">{t.stopAsk}</p>
          <p className="text-[15px] text-muted">{t.stopNote}</p>
          <div className="flex flex-wrap gap-2">
            <Button compact autoFocus onClick={() => setAsking(false)}>
              {t.keep}
            </Button>
            <Button
              compact
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const result = await stopFriendLinksAction();
                  setAsking(false);
                  setUrl(null);
                  setShared("no");
                  setQr(false);
                  setNote(result.ok ? { text: t.stopped, error: false } : { text: t.failed, error: true });
                })
              }
            >
              {t.stop}
            </Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAsking(true)} className="flex min-h-11 w-fit items-center text-[15px] font-semibold text-danger">
          {t.stop}
        </button>
      )}
      {note && (
        <p role={note.error ? "alert" : "status"} className={note.error ? "text-[15px] font-medium text-danger" : "text-[15px] font-medium text-success"}>
          {note.text}
        </p>
      )}
    </Card>
  );
}
