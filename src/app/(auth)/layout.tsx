import { enCA } from "@/lib/i18n/en-CA";

// Sign-in and Setup: a phone-width column, no tabs.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-10 pt-10">
      <p className="mb-6 text-xl font-bold text-primary">{enCA.app.name}</p>
      {children}
    </main>
  );
}
