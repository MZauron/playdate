"use server";

import { revalidatePath } from "next/cache";
import { requireParent } from "@/lib/auth/require-parent";
import { freeStore } from "@/lib/db/free-status";
import { clearFree, freeLimiter, setFree, type FreeResult } from "@/lib/domain/free-status";
import { enCA } from "@/lib/i18n/en-CA";

/** `saved` changes on every success, so the sheet can close the child's row. */
export type FreeState = { error?: string; saved?: number };

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value : undefined;
};

function done(result: FreeResult, previous: FreeState): FreeState {
  if (!result.ok) {
    console.info(`free_status failed code=${result.code}`); // a code only, never the words
    return { error: enCA.free.errors[result.code] };
  }
  revalidatePath("/");
  revalidatePath("/friends", "layout");
  return { saved: (previous.saved ?? 0) + 1 };
}

/** T45 (KD-19): sets one of the signed-in parent's own children free; the rules work out when it turns off. Nothing is sent. */
export async function setFreeAction(previous: FreeState, form: FormData): Promise<FreeState> {
  const { user } = await requireParent();
  const input = { childId: text(form, "childId"), when: text(form, "when"), words: text(form, "words"), zone: text(form, "zone") };
  return done(await setFree({ store: freeStore, limiter: freeLimiter }, user.id, input, new Date()), previous);
}

export async function clearFreeAction(previous: FreeState, form: FormData): Promise<FreeState> {
  const { user } = await requireParent();
  return done(await clearFree({ store: freeStore, limiter: freeLimiter }, user.id, text(form, "childId")), previous);
}
