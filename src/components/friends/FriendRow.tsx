"use client";

import { useActionState, useState } from "react";
import { removeFriendAction, renameFriendAction, type FriendRowState } from "@/app/(app)/friends/actions";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { StatusLine } from "@/components/StatusLine";
import { enCA } from "@/lib/i18n/en-CA";
import type { Friend } from "@/lib/domain/friends";

type Mode = "view" | "rename" | "confirm-remove";

/** One friend: their label, the parent's name, and whether they get the invite in the app or by text. Rename and Remove open in place. */
export function FriendRow({ friend }: { friend: Friend }) {
  const [mode, setMode] = useState<Mode>("view");
  const [renameState, rename, renaming] = useActionState<FriendRowState, FormData>(async (previous, form) => {
    const result = await renameFriendAction(previous, form);
    if (result.done) setMode("view");
    return result;
  }, {});
  const [removeState, remove, removing] = useActionState<FriendRowState, FormData>(removeFriendAction, {});

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{friend.label}</p>
          <p className="truncate text-[15px] text-muted">{friend.parentName}</p>
        </div>
        {friend.hasKindred ? <StatusLine tone="success" className="shrink-0">{enCA.friends.hasKindred}</StatusLine> : <StatusLine tone="muted" className="shrink-0">{enCA.friends.getsText}</StatusLine>}
      </div>

      {mode === "view" && (
        <div className="mt-3 flex gap-2">
          <Button compact onClick={() => setMode("rename")}>
            {enCA.friends.rename}
          </Button>
          <Button compact variant="destructive" onClick={() => setMode("confirm-remove")}>
            {enCA.friends.remove}
          </Button>
        </div>
      )}

      {mode === "rename" && (
        <form action={rename} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="friendId" value={friend.id} />
          <Field id={`label-${friend.id}`} name="label" label={enCA.friends.renameLabel} defaultValue={friend.label} error={renameState.error} maxLength={40} autoFocus />
          <div className="flex gap-2">
            <Button type="submit" compact variant="main" disabled={renaming}>
              {enCA.friends.save}
            </Button>
            <Button compact onClick={() => setMode("view")}>
              {enCA.friends.cancel}
            </Button>
          </div>
        </form>
      )}

      {mode === "confirm-remove" && (
        <form action={remove} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="friendId" value={friend.id} />
          <div>
            <p className="font-semibold">{enCA.friends.removeAsk(friend.label)}</p>
            <p className="text-[15px] text-muted">{enCA.friends.removeNote}</p>
            {removeState.error && (
              <p role="alert" className="mt-1 text-[15px] font-medium text-danger">
                {removeState.error}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="submit" compact variant="destructive" disabled={removing}>
              {enCA.friends.remove}
            </Button>
            <Button compact onClick={() => setMode("view")}>
              {enCA.friends.keep}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
