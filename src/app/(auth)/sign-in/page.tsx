import { redirect } from "next/navigation";
import { homeFor } from "@/lib/auth/require-parent";
import { getCurrentUser } from "@/lib/auth/supabase-server";
import { StatusLine } from "@/components/StatusLine";
import { enCA } from "@/lib/i18n/en-CA";
import { SignInForm } from "./SignInForm";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(await homeFor(user));
  const { deleted } = await searchParams;
  return (
    <>
      {deleted === "1" && (
        <StatusLine tone="success" role="status" className="mb-4">
          {enCA.privacy.deleted}
        </StatusLine>
      )}
      <SignInForm />
    </>
  );
}
