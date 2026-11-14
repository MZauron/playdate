import { AppTabs } from "@/components/AppTabs";

// Every signed-in screen: a phone-width column with the four tabs fixed at the bottom. Sign-in checks arrive with T05.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto min-h-dvh max-w-md px-4 pb-24 pt-4">{children}</main>
      <AppTabs />
    </>
  );
}
