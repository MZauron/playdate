import { notFound } from "next/navigation";
import { LiveAnswers } from "@/components/playdate/LiveAnswers";
import { PlaydatePage } from "@/components/playdate/PlaydatePage";
import { env } from "@/env";
import { requireParent } from "@/lib/auth/require-parent";
import { playdatePageStore } from "@/lib/db/playdate-page";
import { confirmationTexts } from "@/lib/domain/confirmation";
import { isPlaydateId, pageView } from "@/lib/domain/playdate-page";

export const dynamic = "force-dynamic";

// The organizer's playdate page (T10). Another parent's playdate id is simply not found.
export default async function PlaydateRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isPlaydateId(id)) notFound();
  const { user } = await requireParent();
  const playdate = await playdatePageStore.getForOrganizer(user.id, id);
  if (!playdate) notFound();
  const view = pageView(playdate);
  return (
    <PlaydatePage
      playdate={playdate}
      view={view}
      texts={view.confirmed ? confirmationTexts(playdate) : []}
      live={view.cancelled ? null : <LiveAnswers playdateId={id} supabaseUrl={env.NEXT_PUBLIC_SUPABASE_URL} anonKey={env.NEXT_PUBLIC_SUPABASE_ANON_KEY} />}
    />
  );
}
