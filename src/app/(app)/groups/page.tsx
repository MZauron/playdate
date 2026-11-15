import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { Initials } from "@/components/groups/Initials";
import { requireParent } from "@/lib/auth/require-parent";
import { listGroups } from "@/lib/db/groups";
import { enCA } from "@/lib/i18n/en-CA";

export const dynamic = "force-dynamic";

const t = enCA.groups;

// Groups (T19): this parent's own groups, private to them.
export default async function GroupsPage() {
  const { user } = await requireParent();
  const groups = await listGroups(user.id);
  return (
    <div className="flex flex-col gap-5 pb-6">
      <h1 className="text-title font-bold leading-tight">{t.title}</h1>
      {groups.length === 0 ? (
        <p className="text-muted">{t.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {groups.map((g) => (
            <li key={g.id}>
              <Link href={`/groups/${g.id}`} className="block rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <Card className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{g.name}</span>
                    <span className="block text-[15px] text-muted">{t.families(g.memberCount)}</span>
                  </span>
                  <Initials letters={g.initials} />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <ButtonLink href="/groups/new" variant="main" fullWidth>
        {t.create}
      </ButtonLink>
    </div>
  );
}

