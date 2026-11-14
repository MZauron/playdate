// Setup, once per parent (T05): the form's input rules, then the write. The parent is always the signed-in user the caller passes in;
// nothing the form says about who the parent is (an id, a phone number) is read.
import { z } from "zod";
import type { NewChild, SetupStore } from "@/lib/db/profiles";
import { phoneHash, toE164 } from "@/lib/phone";

export const MAX_CHILDREN = 8;
/** "baby" or whole years, as `children.age_label` allows. The picker offers Baby and 1 to 12 yrs. */
export const AGE_OPTIONS = ["baby", ...Array.from({ length: 12 }, (_, i) => String(i + 1))] as const;

export type SetupErrorCode = "NAME_REQUIRED" | "CHILD_NAME_REQUIRED" | "CHILD_AGE_INVALID" | "NEEDS_CHILD" | "TOO_MANY_CHILDREN" | "PHONE_MISSING";
export type SetupError = { code: SetupErrorCode; field: string };

const name = z.string().trim().min(1).max(40);
const setupSchema = z.object({
  firstName: name,
  children: z.array(z.object({ firstName: name, ageLabel: z.string().regex(/^(baby|[1-9][0-9]?)$/) })).min(1).max(MAX_CHILDREN),
});

/** What the Setup form posts: `firstName`, and one `childName` and `childAge` per row, in order. Anything else in it is ignored. */
export function parseSetupForm(form: FormData): { firstName: string; children: { firstName: string; ageLabel: string }[] } {
  const names = form.getAll("childName").map(String);
  const ages = form.getAll("childAge").map(String);
  return {
    firstName: String(form.get("firstName") ?? ""),
    children: names.map((n, i) => ({ firstName: n, ageLabel: ages[i] ?? "" })),
  };
}

/** Which field is wrong and why, for the short messages under the form. Empty when the input is fine. */
export function setupErrors(input: ReturnType<typeof parseSetupForm>): SetupError[] {
  const errors: SetupError[] = [];
  if (!name.safeParse(input.firstName).success) errors.push({ code: "NAME_REQUIRED", field: "firstName" });
  if (input.children.length === 0) errors.push({ code: "NEEDS_CHILD", field: "children" });
  if (input.children.length > MAX_CHILDREN) errors.push({ code: "TOO_MANY_CHILDREN", field: "children" });
  input.children.forEach((child, i) => {
    if (!name.safeParse(child.firstName).success) errors.push({ code: "CHILD_NAME_REQUIRED", field: `child-${i}` });
    else if (!/^(baby|[1-9][0-9]?)$/.test(child.ageLabel)) errors.push({ code: "CHILD_AGE_INVALID", field: `child-${i}` });
  });
  return errors;
}

export type SetupResult = { ok: true; created: boolean } | { ok: false; errors: SetupError[] };

/**
 * `user` comes from `auth.getUser()`: its id is the parent and its phone (Supabase's form, no "+") is hashed here, on the server.
 * A parent who already finished Setup gets `created: false` and nothing is overwritten.
 */
export async function completeSetup(
  deps: { store: SetupStore; phoneHashKey: string },
  user: { id: string; phone: string | undefined },
  input: ReturnType<typeof parseSetupForm>,
): Promise<SetupResult> {
  const errors = setupErrors(input);
  if (errors.length) return { ok: false, errors };
  const parsed = setupSchema.parse(input);
  const e164 = user.phone ? toE164(user.phone) : null;
  if (!e164) return { ok: false, errors: [{ code: "PHONE_MISSING", field: "firstName" }] };

  const children: NewChild[] = parsed.children.map((c) => ({ firstName: c.firstName, ageLabel: c.ageLabel }));
  const outcome = await deps.store.createProfile({ userId: user.id, firstName: parsed.firstName, phoneHash: phoneHash(deps.phoneHashKey, e164), children });
  return { ok: true, created: outcome === "created" };
}
