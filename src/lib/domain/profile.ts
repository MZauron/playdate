// The Profile tab (T39): the parent changes their first name and their children. Same input rules as Setup (src/lib/domain/setup.ts).
// The parent is always the signed-in user the caller passes in; a child id in the form only counts if it is one of theirs (the
// database function checks it, migration 0014).
import { z } from "zod";
import type { ProfileChild, ProfileStore } from "@/lib/db/profiles";
import { setupErrors, type SetupError } from "./setup";

const uuid = z.uuid();

/** What the Profile form posts: `firstName`, and one `childId`, `childName` and `childAge` per row, in order. */
export function parseProfileForm(form: FormData): { firstName: string; children: ProfileChild[] } {
  const ids = form.getAll("childId").map(String);
  const names = form.getAll("childName").map(String);
  const ages = form.getAll("childAge").map(String);
  return {
    firstName: String(form.get("firstName") ?? ""),
    children: names.map((n, i) => ({ id: uuid.safeParse(ids[i]).success ? ids[i]! : null, firstName: n, ageLabel: ages[i] ?? "" })),
  };
}

export type ProfileResult = { ok: true } | { ok: false; errors: SetupError[] };

export async function saveProfile(store: ProfileStore, userId: string, input: ReturnType<typeof parseProfileForm>): Promise<ProfileResult> {
  const errors = setupErrors(input);
  if (errors.length) return { ok: false, errors };
  const saved = await store.updateProfile({
    userId,
    firstName: input.firstName.trim(),
    children: input.children.map((c) => ({ id: c.id, firstName: c.firstName.trim(), ageLabel: c.ageLabel })),
  });
  return saved ? { ok: true } : { ok: false, errors: [{ code: "PHONE_MISSING", field: "firstName" }] };
}
