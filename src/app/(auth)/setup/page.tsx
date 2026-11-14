import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-parent";
import { getParentProfile } from "@/lib/db/profiles";
import { SetupForm } from "./SetupForm";

export default async function SetupPage() {
  const user = await requireUser();
  if (await getParentProfile(user.id)) redirect("/"); // Setup happens once
  return <SetupForm />;
}
