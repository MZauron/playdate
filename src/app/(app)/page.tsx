import { HomeView } from "@/components/home/HomeView";
import { requireParent } from "@/lib/auth/require-parent";
import { DEFAULT_ZONE } from "@/lib/rules/config";

// Always the current time and the current parent.
export const dynamic = "force-dynamic";

// T08 passes the parent's playdates; until then Home is the empty one: the banner and the Plan a playdate card.
export default async function HomePage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { profile } = await requireParent();
  const { welcome } = await searchParams;
  return (
    <HomeView
      firstName={profile.firstName}
      welcome={welcome === "1"}
      childName={profile.children[0]?.firstName} // Q4 default: the first child
      playdates={[]}
      now={new Date()}
      zone={DEFAULT_ZONE}
    />
  );
}
