"use client";

import { useState } from "react";
import { signOutAction } from "@/app/(app)/actions";
import { Button } from "@/components/Button";
import { enCA } from "@/lib/i18n/en-CA";

const t = enCA.profile;

/** T54: Sign out asks first (the mock-up's Account tab); Stay signed in is the safe choice. */
export function SignOutButton() {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="flex min-h-12 w-full items-center rounded-card bg-card px-4 text-left font-semibold shadow-card focus-visible:outline-2 focus-visible:outline-primary"
      >
        {t.signOut}
      </button>
    );
  return (
    <form action={signOutAction} role="group" aria-labelledby="sign-out-ask" className="flex flex-col gap-3 rounded-card bg-card p-4 shadow-card">
      <p id="sign-out-ask" className="font-bold">
        {t.signOutAsk}
      </p>
      <p className="text-[15px] text-muted">{t.signOutNote}</p>
      <div className="flex gap-2">
        <Button compact autoFocus onClick={() => setAsking(false)} className="flex-1">
          {t.signOutKeep}
        </Button>
        <Button type="submit" compact className="flex-1">
          {t.signOutYes}
        </Button>
      </div>
    </form>
  );
}
