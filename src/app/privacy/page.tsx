import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/supabase-server";
import { enCA } from "@/lib/i18n/en-CA";
import { DeleteAccountButton } from "./DeleteAccountButton";

const t = enCA.privacy;

export const metadata: Metadata = { title: `${t.title} · ${enCA.app.name}` };

// Signed in or not: the Delete my account button shows only to a signed-in parent.
export const dynamic = "force-dynamic";

// The privacy page (T24, Q13 default). Linked from Setup, Home and the invite page; outside the staging curtain (see proxy.ts), so
// friends without an account can read it.
export default async function PrivacyPage() {
  const user = await getCurrentUser();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 pb-10 pt-6">
      <p className="text-xl font-bold text-primary">{enCA.app.name}</p>
      <div>
        <h1 className="text-title font-bold leading-tight">{t.title}</h1>
        <p className="mt-2 text-muted">{t.intro}</p>
      </div>
      {t.sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            {section.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ))}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t.deleteTitle}</h2>
        <p>{t.deleteNote}</p>
        {user ? <DeleteAccountButton /> : <p className="text-muted">{t.deleteSignedOut}</p>}
      </section>
      <p className="text-[15px] text-muted">{t.updated}</p>
      {user && (
        <Link href="/" className="flex min-h-11 items-center justify-center font-semibold text-primary">
          {t.backHome}
        </Link>
      )}
    </main>
  );
}
