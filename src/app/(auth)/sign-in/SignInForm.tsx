"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { RESEND_SECONDS } from "@/lib/auth/code-input";
import { enCA } from "@/lib/i18n/en-CA";
import { maskedPhone } from "@/lib/phone";
import { signInAction, type SignInState } from "./actions";

export function SignInForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(signInAction, { step: "phone" });
  return state.step === "phone" ? <PhoneStep state={state} action={action} pending={pending} /> : <CodeStep key={state.sentAt} state={state} action={action} pending={pending} />;
}

type StepProps<S extends SignInState> = { state: S; action: (form: FormData) => void; pending: boolean };

function PhoneStep({ state, action, pending }: StepProps<Extract<SignInState, { step: "phone" }>>) {
  return (
    <form action={action} className="flex flex-col gap-5">
      <h1 className="text-title font-bold leading-tight">{enCA.signIn.title}</h1>
      <input type="hidden" name="intent" value="send" />
      <Field
        id="phone"
        name="phone"
        label={enCA.signIn.phoneLabel}
        hint={enCA.signIn.phoneHint}
        error={state.error}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder={enCA.signIn.phonePlaceholder}
        defaultValue={state.phoneInput}
        required
      />
      <Button type="submit" variant="main" fullWidth disabled={pending}>
        {enCA.signIn.sendCode}
      </Button>
    </form>
  );
}

function CodeStep({ state, action, pending }: StepProps<Extract<SignInState, { step: "code" }>>) {
  const [secondsLeft, setSecondsLeft] = useState(state.sentAt ? RESEND_SECONDS : 0);
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-title font-bold leading-tight">{enCA.signIn.codeTitle}</h1>
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="intent" value="verify" />
        <input type="hidden" name="phoneE164" value={state.phone} />
        <Field
          id="code"
          name="code"
          label={enCA.signIn.codeLabel}
          hint={enCA.signIn.codeSent(maskedPhone(state.phone))}
          error={state.error}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          autoFocus
          required
        />
        <Button type="submit" variant="main" fullWidth disabled={pending}>
          {enCA.signIn.submitCode}
        </Button>
      </form>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="phoneE164" value={state.phone} />
        <Button type="submit" name="intent" value="resend" fullWidth disabled={pending || secondsLeft > 0}>
          {secondsLeft > 0 ? enCA.signIn.resendIn(secondsLeft) : enCA.signIn.resend}
        </Button>
        <Button type="submit" name="intent" value="restart" fullWidth disabled={pending}>
          {enCA.signIn.otherNumber}
        </Button>
      </form>
    </div>
  );
}
