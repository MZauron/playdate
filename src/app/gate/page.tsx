import type { Metadata } from "next";
import { safeNext } from "@/lib/gate/gate";
import { enCA } from "@/lib/i18n/en-CA";
import { GateForm } from "./GateForm";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// The staging curtain (SITE_PASSWORD). Shown by src/proxy.ts to visitors without the gate cookie.
export default async function GatePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-10 pt-10">
      <p className="text-xl font-bold text-primary">{enCA.app.name}</p>
      <h1 className="text-title font-bold leading-tight">{enCA.gate.title}</h1>
      <p className="text-muted">{enCA.gate.note}</p>
      <GateForm next={safeNext(next)} />
    </main>
  );
}
