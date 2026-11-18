"use client";

import { useActionState } from "react";
import { confirmAction, type ConfirmState } from "@/app/(app)/playdates/[id]/actions";
import { Button } from "@/components/Button";
import { enCA, formatShortWhen } from "@/lib/i18n/en-CA";

/**
 * KD-09: the set time's one button, "Confirm · Sat, Nov 21, 10 to 12" (T44), enabled at the first yes. The server checks again
 * (CONFIRM_NEEDS_YES).
 */
export function ConfirmButton({ playdateId, enabled, range, zone }: { playdateId: string; enabled: boolean; range?: { start: Date; end: Date } | null; zone?: string }) {
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
        {range && zone ? enCA.playdate.confirmAt(formatShortWhen(range.start, range.end, zone)) : enCA.playdate.confirm}
      </Button>
    </form>
  );
}
