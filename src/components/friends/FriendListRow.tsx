import Link from "next/link";
import { enCA } from "@/lib/i18n/en-CA";
import type { Friend } from "@/lib/domain/friends";
import { Avatar } from "./Avatar";

/**
 * T40: one friend in the Friends tab list: initials, their label and name, has Kindred or gets a text; opens their page. T45: a green
 * dot and "Arjun is free tomorrow" in place of the second line while a child of theirs is free (KD-19).
 */
export function FriendListRow({ friend, free }: { friend: Friend; free?: string }) {
  return (
    <Link
      href={`/friends/${friend.id}`}
      aria-label={enCA.friends.page.openLabel(friend.label)}
      className="flex min-h-16 items-center gap-3 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span className="relative">
        <Avatar name={friend.parentName} />
        {free && <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-success ring-2 ring-card" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{friend.label}</span>
        {free ? (
          <span className="block truncate text-[14px] font-semibold text-success">{free}</span>
        ) : (
          <span className="block truncate text-[14px] text-muted">
            {friend.parentName} · {friend.hasKindred ? enCA.friends.hasKindred : enCA.friends.getsText}
          </span>
        )}
      </span>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 text-muted/70" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
