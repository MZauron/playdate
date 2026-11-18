import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { InviteShell } from "@/components/invite/InviteShell";
import { getCurrentUser } from "@/lib/auth/supabase-server";
import { friendLinkStore } from "@/lib/db/friend-links";
import { getParentProfile } from "@/lib/db/profiles";
import { loadFriendLink } from "@/lib/domain/friend-links";
import { enCA } from "@/lib/i18n/en-CA";
import { acceptAction, forgetAction, joinAction } from "./actions";

const t = enCA.friendLink;

export const dynamic = "force-dynamic";

// The token is in the URL: never indexed, never sent on as a referrer.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

// Invite to Kindred (T34): who invites (first name and first child only), and one main action: Join Kindred when signed out (or
// before Setup), Become friends with Alex when signed in. Saying yes happens only here, never on its own.
export default async function FriendLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const owner = await loadFriendLink(friendLinkStore, token);
  if (!owner) {
    return (
      <InviteShell>
        <h1 className="text-title font-extrabold tracking-tight leading-tight">{t.notFoundTitle}</h1>
        <p className="text-muted">{t.notFoundNote}</p>
        <form action={forgetAction}>
          <Button type="submit" fullWidth>
            {t.backHome}
          </Button>
        </form>
      </InviteShell>
    );
  }
  const user = await getCurrentUser();
  const parent = user && (await getParentProfile(user.id));
  return (
    <InviteShell>
      <header className="flex items-center gap-3">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-tint text-lg font-bold text-primary">
          {owner.firstName.trim()[0]?.toUpperCase() ?? "?"}
        </span>
        <div>
          <h1 className="text-xl font-bold leading-tight">{t.invites(owner.firstName)}</h1>
          {owner.childFirstName && <p className="text-[15px] text-muted">{t.parentOf(owner.childFirstName)}</p>}
        </div>
      </header>
      <p>{t.about}</p>
      {user && owner.ownerId === user.id ? (
        <p className="font-medium text-muted">{t.own}</p>
      ) : parent ? (
        <div className="flex flex-col gap-3">
          <form action={acceptAction}>
            <input type="hidden" name="token" value={token} />
            <Button type="submit" variant="main" fullWidth>
              {t.accept(owner.firstName)}
            </Button>
          </form>
          <form action={forgetAction}>
            <Button type="submit" fullWidth>
              {t.notNow}
            </Button>
          </form>
        </div>
      ) : (
        <form action={joinAction}>
          <input type="hidden" name="token" value={token} />
          <Button type="submit" variant="main" fullWidth>
            {t.join}
          </Button>
        </form>
      )}
    </InviteShell>
  );
}

