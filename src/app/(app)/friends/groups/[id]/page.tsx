import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { DeleteGroup } from "@/components/groups/DeleteGroup";
import { removeMemberAction } from "@/app/(app)/friends/groups/actions";
import { Initials } from "@/components/groups/Initials";
import { requireParent } from "@/lib/auth/require-parent";
import { getGroup, lastPlaydateWith } from "@/lib/db/groups";
import { enCA, formatShortDay } from "@/lib/i18n/en-CA";

export const dynamic = "force-dynamic";

const t = enCA.groups;

// A group (T19): its families with Remove, the last playdate, Plan a playdate (pre-selected), Plan again, Edit, and ⋯ Delete group.
export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { user } = await requireParent();
  const group = await getGroup(user.id, id);
  if (!group) notFound();
  const last = await lastPlaydateWith(user.id, group.members.map((m) => m.friendId));

  return (
    <div className="flex flex-col gap-5 pb-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Link href="/friends" className="-ml-2 flex min-h-11 items-center px-2 text-[15px] font-semibold text-primary">
            ← {enCA.tabs.friends}
          </Link>
          <DeleteGroup groupId={group.id} />
        </div>
        <h1 className="text-title font-extrabold tracking-tight leading-tight">{group.name}</h1>
        <div className="flex items-center gap-3">
          <Initials letters={group.members.map((m) => (m.parentName.trim()[0] ?? "?").toUpperCase())} />
          <span className="text-[15px] text-muted">{t.families(group.members.length)}</span>
        </div>
        <p className="text-[15px] text-muted">{last ? t.lastPlaydate(last.title, last.start ? formatShortDay(last.start, last.timezone) : "") : t.noPlaydateYet}</p>
      </header>

      <div className="flex flex-col gap-3">
        <ButtonLink href={`/plan?group=${group.id}`} variant="main" fullWidth>
          {t.planWith(group.members.length)}
        </ButtonLink>
        {last && (
          <ButtonLink href={`/plan?group=${group.id}&again=${last.id}`} fullWidth>
            {t.planAgain}
          </ButtonLink>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {group.members.map((m) => (
          <li key={m.friendId}>
            <Card className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{m.label}</span>
                <span className="block text-[15px] text-muted">{m.hasKindred ? enCA.friends.hasKindred : enCA.friends.getsText}</span>
              </span>
              <form action={removeMemberAction}>
                <input type="hidden" name="groupId" value={group.id} />
                <input type="hidden" name="friendId" value={m.friendId} />
                <button type="submit" aria-label={t.removeLabel(m.label)} className="inline-flex h-11 items-center rounded-button px-3 text-[15px] font-semibold text-danger">
                  {t.remove}
                </button>
              </form>
            </Card>
          </li>
        ))}
      </ul>

      <ButtonLink href={`/friends/groups/${group.id}/edit`} fullWidth>
        {t.edit}
      </ButtonLink>
    </div>
  );
}
