"use client";

import { useState, useTransition } from "react";
import { setFriendKidsAction } from "@/app/(app)/friends/actions";
import { Chip } from "@/components/Chip";
import { enCA } from "@/lib/i18n/en-CA";

const t = enCA.friends.page;

/** T42: "Friends with" chips on a friend's page, saved as soon as one is tapped. At least one child stays chosen. */
export function FriendKids({ friendId, firstName, kids, initial }: { friendId: string; firstName: string; kids: readonly { id: string; firstName: string }[]; initial: string[] }) {
  const [chosen, setChosen] = useState(initial);
  const [failed, setFailed] = useState(false);
  const [, start] = useTransition();
  const toggle = (id: string) => {
    const next = chosen.includes(id) ? chosen.filter((c) => c !== id) : kids.map((k) => k.id).filter((k) => k === id || chosen.includes(k));
    if (!next.length) return; // a friend always knows at least one of your kids
    const before = chosen;
    setChosen(next);
    start(async () => {
      const result = await setFriendKidsAction(friendId, next);
      setFailed(!result.ok);
      if (!result.ok) setChosen(before);
    });
  };
  return (
    <section aria-labelledby="friends-with-title">
      <h2 id="friends-with-title" className="mb-2 px-1 text-label font-bold uppercase tracking-wider text-muted">
        {t.friendsWith}
      </h2>
      <div className="flex flex-wrap gap-2">
        {kids.map((k) => (
          <Chip key={k.id} selected={chosen.includes(k.id)} onClick={() => toggle(k.id)}>
            {k.firstName}
          </Chip>
        ))}
      </div>
      <p className="mt-2 px-1 text-[14px] text-muted">{t.friendsWithNote(firstName)}</p>
      {failed && (
        <p role="alert" className="mt-1 px-1 text-[14px] font-medium text-danger">
          {t.saveFailed}
        </p>
      )}
    </section>
  );
}
