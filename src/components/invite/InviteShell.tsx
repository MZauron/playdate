import { enCA } from "@/lib/i18n/en-CA";

/** The invite page's column: phone width, the Kindred name on top, no tabs (a friend may have no account). */
export function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 pb-10 pt-6">
      <p className="text-xl font-bold text-primary">{enCA.app.name}</p>
      {children}
    </main>
  );
}

/** A page with one heading and one line: link not found, too many tries. */
export function InviteMessage({ title, note }: { title: string; note: string }) {
  return (
    <InviteShell>
      <h1 className="text-title font-bold leading-tight">{title}</h1>
      <p className="text-muted">{note}</p>
    </InviteShell>
  );
}
