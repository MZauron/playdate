"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { addFriendAction, type AddFriendState } from "@/app/(app)/friends/actions";
import { Button, type ButtonVariant } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { StatusLine } from "@/components/StatusLine";
import { enCA } from "@/lib/i18n/en-CA";
import { contactsManager, pickContact } from "./contact-picker";

/**
 * Add a friend: name, child's first name and number. Where the browser has a contact picker, "Choose from contacts" fills name and number.
 * On the Plan screen Send invite is the coral action, so the form's own button is secondary there.
 */
export function AddFriendForm({ submitVariant = "main" }: { submitVariant?: ButtonVariant }) {
  const [state, action, pending] = useActionState<AddFriendState, FormData>(addFriendAction, { version: 0, errors: {} });
  // The boxes empty after each add: a new `key` remounts them.
  return (
    <Card>
      <form action={action} className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{enCA.friends.addTitle}</h2>
        <AddFriendFields key={state.version} errors={state.errors} />
        {state.errors.form && (
          <p role="alert" className="text-[15px] font-medium text-danger">
            {state.errors.form}
          </p>
        )}
        {state.added && <StatusLine tone="success">{state.added}</StatusLine>}
        <Button type="submit" variant={submitVariant} fullWidth disabled={pending}>
          {enCA.friends.add}
        </Button>
      </form>
    </Card>
  );
}

const noSubscription = () => () => {};

function AddFriendFields({ errors }: { errors: Record<string, string> }) {
  const [name, setName] = useState("");
  const [childName, setChildName] = useState("");
  const [phone, setPhone] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  // Only the phone's browser knows whether it has a contact picker, so the server and the first paint say no.
  const canPick = useSyncExternalStore(noSubscription, () => contactsManager() !== null, () => false);

  return (
    <>
      {canPick && (
        <Button
          type="button"
          fullWidth
          onClick={async () => {
            const contact = await pickContact();
            if (!contact) return;
            if (contact.name) setName(contact.name);
            if (contact.phone) setPhone(contact.phone);
          }}
        >
          {enCA.friends.chooseContacts}
        </Button>
      )}
      <Field id="friend-name" name="name" label={enCA.friends.parentNameLabel} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="off" maxLength={60} />
      <Field
        id="friend-child"
        name="childName"
        label={enCA.friends.childNameLabel}
        value={childName}
        onChange={(e) => setChildName(e.target.value)}
        error={errors.childName}
        autoComplete="off"
        maxLength={40}
      />
      <div>
        <Field
          id="friend-phone"
          name="phone"
          label={enCA.friends.phoneLabel}
          hint={enCA.friends.phoneHint}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone ?? pasteError ?? undefined}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder={enCA.signIn.phonePlaceholder}
        />
        <Button
          type="button"
          compact
          className="mt-2"
          onClick={async () => {
            setPasteError(null);
            try {
              setPhone((await navigator.clipboard.readText()).trim());
            } catch {
              setPasteError(enCA.friends.pasteFailed);
            }
          }}
        >
          {enCA.friends.pasteNumber}
        </Button>
      </div>
    </>
  );
}
