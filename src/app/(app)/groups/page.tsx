import { enCA } from "@/lib/i18n/en-CA";

// A placeholder until its task builds it (Groups T19, Ask and Explore T18).
export default function Page() {
  return (
    <section className="flex flex-col gap-2 pt-6">
      <h1 className="text-title font-bold">{enCA.tabs.groups}</h1>
      <p className="text-muted">{enCA.app.comingSoon}</p>
    </section>
  );
}
