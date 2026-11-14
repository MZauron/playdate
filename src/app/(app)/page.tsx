import { HomeView } from "@/components/home/HomeView";
import { DEFAULT_ZONE } from "@/lib/rules/config";

// Always the current time.
export const dynamic = "force-dynamic";

// T05 passes the signed-in parent (name, child, first visit) and T08 their playdates. Until then Home is the empty one:
// the banner and the Plan a playdate card.
export default function HomePage() {
  return <HomeView playdates={[]} now={new Date()} zone={DEFAULT_ZONE} />;
}
