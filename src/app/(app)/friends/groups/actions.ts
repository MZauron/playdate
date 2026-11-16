"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireParent } from "@/lib/auth/require-parent";
import { groupStore } from "@/lib/db/groups";
import { deleteGroup, parseGroupForm, removeMember, saveGroup } from "@/lib/domain/groups";
import { enCA } from "@/lib/i18n/en-CA";

export type GroupFormState = { errors: Record<string, string> };

/** Create a group, or Edit one (`groupId` in the form). Whose group it is comes from the session. */
export async function saveGroupAction(_previous: GroupFormState, form: FormData): Promise<GroupFormState> {
  const { user } = await requireParent();
  const groupId = String(form.get("groupId") ?? "") || null;
  const result = await saveGroup(groupStore, user.id, groupId, parseGroupForm(form));
  if (!result.ok) return { errors: { [result.field ?? "form"]: enCA.groups.errors[result.code] } };
  revalidatePath("/friends");
  revalidatePath("/plan");
  redirect(`/friends/groups/${result.groupId}`);
}

/** Remove one friend from a group; they stay a friend. */
export async function removeMemberAction(form: FormData): Promise<void> {
  const { user } = await requireParent();
  const groupId = String(form.get("groupId") ?? "");
  await removeMember(groupStore, user.id, groupId, String(form.get("friendId") ?? ""));
  revalidatePath(`/friends/groups/${groupId}`);
  revalidatePath("/friends");
}

/** Delete group, after the page asked. Its friends stay friends. */
export async function deleteGroupAction(form: FormData): Promise<void> {
  const { user } = await requireParent();
  await deleteGroup(groupStore, user.id, String(form.get("groupId") ?? ""));
  revalidatePath("/friends");
  redirect("/friends");
}
