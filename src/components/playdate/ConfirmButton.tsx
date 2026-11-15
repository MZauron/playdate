"use client";

import { useActionState } from "react";
import { confirmAction, type ConfirmState } from "@/app/(app)/playdates/[id]/actions";
import { Button } from "@/components/Button";
import { enCA } from "@/lib/i18n/en-CA";

/** KD-09: Confirm and send update, enabled at the first yes. The server checks again (CONFIRM_NEEDS_YES). */
export function ConfirmButton({ playdateId, enabled }: { playdateId: string; enabled: boolean }) {
  const [state, action, pending] = useActionState<ConfirmState, FormData>(confirmAction, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="playdateId" value={playdateId} />
      {state.error && (
        <p role="alert" className="text-[15px] font-medium text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="main" fullWidth disabled={!enabled || pending}>
        {enCA.playdate.confirm}
      </Button>
    </form>
  );
}
