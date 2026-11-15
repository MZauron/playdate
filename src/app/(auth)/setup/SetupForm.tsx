"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/Button";
import { Field, SelectField } from "@/components/Field";
import { AGE_OPTIONS, MAX_CHILDREN } from "@/lib/domain/setup";
import { enCA } from "@/lib/i18n/en-CA";
import { setupAction, type SetupState } from "./actions";

type Row = { key: number; name: string; age: string };

export function SetupForm() {
  const [state, action, pending] = useActionState<SetupState, FormData>(setupAction, { errors: {} });
  const [firstName, setFirstName] = useState("");
  const [rows, setRows] = useState<Row[]>([{ key: 0, name: "", age: "" }]);
  const [nextKey, setNextKey] = useState(1);
  const update = (key: number, patch: Partial<Row>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <h1 className="text-title font-bold leading-tight">{enCA.setup.title}</h1>
        <p className="mt-1 text-muted">{enCA.setup.subtitle}</p>
      </div>
      <Field
        id="firstName"
        name="firstName"
        label={enCA.setup.firstNameLabel}
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        error={state.errors.firstName ?? state.errors.children}
        autoComplete="given-name"
        maxLength={40}
      />
      {rows.map((row, i) => (
        <fieldset key={row.key} className="flex items-start gap-3">
          <Field
            id={`childName-${row.key}`}
            name="childName"
            label={enCA.setup.childNameLabel}
            value={row.name}
            onChange={(e) => update(row.key, { name: e.target.value })}
            error={state.errors[`child-${i}`] && !row.name.trim() ? state.errors[`child-${i}`] : undefined}
            maxLength={40}
            className="min-w-0 flex-1"
          />
          <SelectField
            id={`childAge-${row.key}`}
            name="childAge"
            label={enCA.setup.childAgeLabel}
            value={row.age}
            onChange={(e) => update(row.key, { age: e.target.value })}
            error={state.errors[`child-${i}`] && row.name.trim() ? state.errors[`child-${i}`] : undefined}
            className="w-32 shrink-0"
          >
            <option value="">{enCA.setup.agePlaceholder}</option>
            {AGE_OPTIONS.map((age) => (
              <option key={age} value={age}>
                {age === "baby" ? enCA.setup.ageBaby : enCA.setup.ageYears(Number(age))}
              </option>
            ))}
          </SelectField>
          {rows.length > 1 && (
            <button
              type="button"
              aria-label={enCA.setup.removeChild(i + 1)}
              onClick={() => setRows((all) => all.filter((r) => r.key !== row.key))}
              className="mt-8 flex size-11 shrink-0 items-center justify-center rounded-full text-xl text-muted focus-visible:outline-2 focus-visible:outline-primary"
            >
              ×
            </button>
          )}
        </fieldset>
      ))}
      {rows.length < MAX_CHILDREN && (
        <Button
          type="button"
          fullWidth
          onClick={() => {
            setRows((all) => [...all, { key: nextKey, name: "", age: "" }]);
            setNextKey((k) => k + 1);
          }}
        >
          {enCA.setup.addChild}
        </Button>
      )}
      {/* Q13 default: a consent line at Setup, with the privacy page a tap away (a new tab, so the form keeps what was typed). */}
      <p className="text-[15px] text-muted">
        {enCA.setup.consent}{" "}
        <a href="/privacy" target="_blank" rel="noopener" className="font-medium text-primary underline underline-offset-2">
          {enCA.setup.consentLink}
        </a>
      </p>
      <Button type="submit" variant="main" fullWidth disabled={pending}>
        {enCA.setup.submit}
      </Button>
    </form>
  );
}
