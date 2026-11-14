import { enCA } from "@/lib/i18n/en-CA";

// Placeholder until T06 builds Home.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-4">
      <div className="rounded-card bg-card p-6 shadow-card">
        <h1 className="text-title font-bold text-primary">{enCA.app.name}</h1>
        <p className="mt-2 text-muted">{enCA.app.description}</p>
        <p className="mt-4 text-label font-semibold uppercase tracking-wider text-muted">
          {enCA.app.comingSoon}
        </p>
      </div>
    </main>
  );
}
