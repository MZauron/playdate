import Link from "next/link";
import { enCA } from "@/lib/i18n/en-CA";
import { cx } from "./cx";

export type TabId = "home" | "friends" | "places" | "profile";

/** T32 (Q25): Home · Friends (groups inside) · Places (Ask Kindred and Explore together, Q7); T39 adds Profile. */
export const TABS: readonly { id: TabId; href: string }[] = [
  { id: "home", href: "/" },
  { id: "friends", href: "/friends" },
  { id: "places", href: "/places" },
  { id: "profile", href: "/profile" },
];

const ICONS: Record<TabId, React.ReactNode> = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  friends: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M16 14.6c2.8.1 4.9 1.8 5.5 4.9" />
    </>
  ),
  places: (
    <>
      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </>
  ),
};

/**
 * The four tabs, floating at the bottom of every signed-in screen (T36, the mock-up): an icon over each name, at least 44 px, the
 * active one on a teal tint.
 */
export function BottomTabs({ active }: { active: TabId | null }) {
  return (
    <nav aria-label={enCA.tabs.label} className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(12px,env(safe-area-inset-bottom))]">
      <ul className="mx-auto flex max-w-md gap-0.5 rounded-[32px] bg-white/90 p-1.5 shadow-[0_10px_30px_rgb(17_23_41/0.10),0_0_0_1px_#e6eaee] backdrop-blur-xl">
        {TABS.map((tab) => (
          <li key={tab.id} className="flex-1">
            <Link
              href={tab.href}
              aria-current={tab.id === active ? "page" : undefined}
              className={cx(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[26px] text-[11px] font-semibold focus-visible:outline-2 focus-visible:outline-primary",
                tab.id === active ? "bg-primary-tint text-primary-strong" : "text-muted",
              )}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
                {ICONS[tab.id]}
              </svg>
              {enCA.tabs[tab.id]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
