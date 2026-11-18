"use client";

import { useActionState, useState } from "react";
import { sayItAction, type SayItState } from "@/app/(app)/plan/actions";
import { enCA } from "@/lib/i18n/en-CA";
import { Button } from "../Button";
import { Card } from "../Card";
import { Field } from "../Field";

/**
 * T43, Or just say it: one sentence fills in the Plan screen ("Dev, Saturday 2 to 4 at the park"). It only opens Plan; the parent
 * checks each step, writes the message and sends. Teal, not coral: the Plan card or Plan another is Home's one main action.
 */
export function SayIt() {
  const [state, action, pending] = useActionState<SayItState, FormData>(sayItAction, {});
  const t = enCA.home.sayIt;
  // Controlled, so the sentence stays in the box after "Try who, when and where" and the parent can fix it.
  const [words, setWords] = useState("");
  return (
    <Card>
      <form
        action={(form) => {
          form.set("zone", Intl.DateTimeFormat().resolvedOptions().timeZone); // "today" on the parent's own clock
          action(form);
        }}
        className="flex flex-col gap-3"
      >
        <Field
          id="say-it"
          name="words"
          label={t.label}
          placeholder={t.placeholder}
          value={words}
          onChange={(e) => setWords(e.target.value)}
          maxLength={200}
          autoComplete="off"
          enterKeyHint="go"
          error={state.error}
          required
        />
        <Button type="submit" variant="secondary" fullWidth disabled={pending}>
          {pending ? t.pending : t.button}
        </Button>
      </form>
    </Card>
  );
}
