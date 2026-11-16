"use client";

import { useActionState, useState } from "react";
import { saveGroupAction, type GroupFormState } from "@/app/(app)/friends/groups/actions";
import { Button } from "@/components/Button";
import { cx } from "@/components/cx";
import { Field } from "@/components/Field";
import type { Friend } from "@/lib/domain/friends";
import { enCA } from "@/lib/i18n/en-CA";

const t = enCA.groups;

/** Create a group, or Edit one: a name and the families in it. "Only you can see it." */
export function GroupForm({ friends, group }: { friends: Friend[]; group?: { id: string; name: string; friendIds: string[] } }) {
  const [state, action, pending] = useActionState<GroupFormState, FormData>(saveGroupAction, { errors: {} });
  const [name, setName] = useState(group?.name ?? "");
  const [selected, setSelected] = useState<string[]>(group?.friendIds ?? []);
  const toggle = (id: string) => setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  return (
    <form action={action} className="flex flex-col gap-5">
      {group && <input type="hidden" name="groupId" value={group.id} />}
      {selected.map((id) => (
        <input key={id} type="hidden" name="friendId" value={id} />
      ))}
      <div>
        <Field id="group-name" name="name" label={t.nameLabel} placeholder={t.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} error={state.errors.name} maxLength={40} autoComplete="off" />
        <p className="mt-1.5 text-[15px] text-muted">{t.privateNote}</p>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[15px] font-semibold">{t.membersLabel}</legend>
        {friends.length === 0 && <p className="text-muted">{t.noFriends}</p>}
        {friends.map((friend) => {
          const on = selected.includes(friend.id);
          return (
            <button
              key={friend.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(friend.id)}
              className={cx(
                "flex min-h-14 w-full items-center gap-3 rounded-card px-4 py-2 text-left shadow-card focus-visible:outline-2 focus-visible:outline-primary",
                on ? "bg-primary-tint ring-1 ring-primary" : "bg-card",
              )}
            >
              <span aria-hidden="true" className={cx("flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold", on ? "bg-primary text-white" : "ring-2 ring-black/15")}>
                {on ? "✓" : ""}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{friend.label}</span>
                <span className="block text-[15px] text-muted">{friend.parentName}</span>
              </span>
            </button>
          );
        })}
        {state.errors.members && (
          <p role="alert" className="text-[15px] font-medium text-danger">
            {state.errors.members}
          </p>
        )}
      </fieldset>
      {state.errors.form && (
        <p role="alert" className="text-[15px] font-medium text-danger">
          {state.errors.form}
        </p>
      )}
      <Button type="submit" variant="main" fullWidth disabled={pending}>
        {group ? t.saveEdit : t.saveNew}
      </Button>
    </form>
  );
}
