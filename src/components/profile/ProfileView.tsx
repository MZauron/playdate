"use client";

import { useActionState, useState } from "react";
import { saveProfileAction, type ProfileState } from "@/app/(app)/profile/actions";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field, SelectField } from "@/components/Field";
import { AGE_OPTIONS, MAX_CHILDREN } from "@/lib/domain/setup";
import { enCA, joinNames } from "@/lib/i18n/en-CA";

const t = enCA.profile;
type Child = { id: string; firstName: string; ageLabel: string };
type Row = { key: string; id: string; name: string; age: string };

/** T39: the parent's card and kids, and Edit for both (Setup's fields, so the same rules). */
export function ProfileView({ firstName, childList, saved }: { firstName: string; childList: readonly Child[]; saved: boolean }) {
  const [editing, setEditing] = useState(false);
  const initials = firstName.trim().slice(0, 1).toUpperCase();
  if (editing) return <ProfileForm firstName={firstName} childList={childList} onCancel={() => setEditing(false)} />;
  return (
    <div className="flex flex-col gap-3">
      {saved && (
        <p role="status" className="text-[15px] font-semibold text-success">
          {t.saved}
        </p>
      )}
      <Card className="flex items-center gap-3.5">
        <span aria-hidden="true" className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-primary text-lg font-extrabold text-white">
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold">{firstName}</span>
          <span className="block text-[14px] text-muted">{t.parentOf(joinNames(childList.map((c) => c.firstName)))}</span>
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={t.editLabel}
          className="flex min-h-11 items-center rounded-full px-3 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          {t.edit}
        </button>
      </Card>
      <section aria-labelledby="kids-title">
        <h2 id="kids-title" className="mb-2 mt-3 px-1 text-label font-bold uppercase tracking-wider text-muted">
          {t.kidsTitle}
        </h2>
        <Card className="px-4 py-1">
          <ul>
            {childList.map((c) => (
              <li key={c.id} className="flex items-center gap-3 border-page py-3 [&+&]:border-t">
                <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-white">
                  {c.firstName.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block font-bold">{c.firstName}</span>
                  <span className="block text-[14px] text-muted">{t.age(c.ageLabel)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}

function ProfileForm({ firstName, childList, onCancel }: { firstName: string; childList: readonly Child[]; onCancel: () => void }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfileAction, { errors: {} });
  const [name, setName] = useState(firstName);
  const [rows, setRows] = useState<Row[]>(childList.map((c) => ({ key: c.id, id: c.id, name: c.firstName, age: c.ageLabel })));
  const [nextKey, setNextKey] = useState(0);
  const update = (key: string, patch: Partial<Row>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold">{t.editTitle}</h2>
        <p className="mt-1 text-[15px] text-muted">{t.editNote}</p>
      </div>
      <Field
        id="firstName"
        name="firstName"
        label={enCA.setup.firstNameLabel}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={state.errors.firstName ?? state.errors.children}
        autoComplete="given-name"
        maxLength={40}
      />
      {rows.map((row, i) => (
        <fieldset key={row.key} className="flex items-start gap-3">
          <input type="hidden" name="childId" value={row.id} />
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
            setRows((all) => [...all, { key: `new-${nextKey}`, id: "", name: "", age: "" }]);
            setNextKey((k) => k + 1);
          }}
        >
          {enCA.setup.addChild}
        </Button>
      )}
      <div className="flex gap-3">
        <Button type="button" fullWidth onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button type="submit" variant="main" fullWidth disabled={pending}>
          {t.save}
        </Button>
      </div>
    </form>
  );
}
