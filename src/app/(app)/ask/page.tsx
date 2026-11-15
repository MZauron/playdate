import { AskPlaces } from "@/components/places/AskPlaces";
import { requireParent } from "@/lib/auth/require-parent";
import { enCA } from "@/lib/i18n/en-CA";

export const dynamic = "force-dynamic";

// Ask Kindred (T18): the parent's words → up to four places with a reason each, and Plan a playdate here.
export default async function AskPage() {
  await requireParent();
  return (
    <section className="flex flex-col gap-4 pt-6 pb-6">
      <h1 className="text-title font-bold leading-tight">{enCA.ask.title}</h1>
      <p className="text-muted">{enCA.ask.intro}</p>
      <AskPlaces />
    </section>
  );
}
