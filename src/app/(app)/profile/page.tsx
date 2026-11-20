import Link from "next/link";
import { DeleteAccountButton } from "@/app/privacy/DeleteAccountButton";
import { ProfileView } from "@/components/profile/ProfileView";
import { SignOutButton } from "@/components/profile/SignOutButton";
import { requireParent } from "@/lib/auth/require-parent";
import { enCA } from "@/lib/i18n/en-CA";

export const dynamic = "force-dynamic";

const t = enCA.profile;

// T39: the Profile tab, called Account since T54: the parent's first name and kids (Edit), privacy, Sign out (asks first) and Delete
// my account (asks first). The route stays /profile.
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { profile } = await requireParent();
  const { saved } = await searchParams;
  return (
    <div className="flex flex-col gap-6 pb-6">
      <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">{t.title}</h1>
      <ProfileView firstName={profile.firstName} childList={profile.children} saved={saved === "1"} />
      <section aria-labelledby="account-title" className="flex flex-col gap-3">
        <h2 id="account-title" className="px-1 text-label font-bold uppercase tracking-wider text-muted">
          {t.accountTitle}
        </h2>
        <Link href="/privacy" className="flex min-h-12 items-center rounded-card bg-card px-4 font-semibold shadow-card focus-visible:outline-2 focus-visible:outline-primary">
          {t.privacy}
        </Link>
        <SignOutButton />
        <DeleteAccountButton />
      </section>
    </div>
  );
}
