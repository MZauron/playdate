"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { enCA } from "@/lib/i18n/en-CA";
import { openGateAction, type GateState } from "./actions";

export function GateForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<GateState, FormData>(openGateAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <Field id="gate-password" name="password" type="password" label={enCA.gate.label} error={state.error} autoComplete="current-password" required />
      <Button type="submit" variant="main" fullWidth disabled={pending}>
        {enCA.gate.submit}
      </Button>
    </form>
  );
}
