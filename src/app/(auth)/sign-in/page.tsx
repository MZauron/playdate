import { redirect } from "next/navigation";
import { homeFor } from "@/lib/auth/require-parent";
import { getCurrentUser } from "@/lib/auth/supabase-server";
import { SignInForm } from "./SignInForm";

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) redirect(await homeFor(user));
  return <SignInForm />;
}
