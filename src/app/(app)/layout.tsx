import { AppTabs } from "@/components/AppTabs";
import { requireParent } from "@/lib/auth/require-parent";

// Every signed-in screen: a phone-width column with the four tabs fixed at the bottom. A signed-out visitor goes to sign-in,
// a parent who has not finished Setup goes to Setup.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireParent();
  return (
    <>
      <main className="mx-auto min-h-dvh max-w-md px-4 pb-24 pt-4">{children}</main>
      <AppTabs />
    </>
  );
}
