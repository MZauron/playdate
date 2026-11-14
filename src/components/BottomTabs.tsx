import Link from "next/link";
import { enCA } from "@/lib/i18n/en-CA";
import { cx } from "./cx";

export type TabId = "home" | "groups" | "ask" | "explore";

export const TABS: readonly { id: TabId; href: string }[] = [
  { id: "home", href: "/" },
  { id: "groups", href: "/groups" },
  { id: "ask", href: "/ask" },
  { id: "explore", href: "/explore" },
];

/** The four tabs at the bottom of every signed-in screen. Each is at least 44 px; the active one is teal. */
export function BottomTabs({ active }: { active: TabId | null }) {
  return (
    <nav aria-label={enCA.tabs.label} className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-card pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md">
        {TABS.map((tab) => (
          <li key={tab.id} className="flex-1">
            <Link
              href={tab.href}
              aria-current={tab.id === active ? "page" : undefined}
              className={cx(
                "flex min-h-14 items-center justify-center text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-primary",
                tab.id === active ? "text-primary" : "text-muted",
              )}
            >
              {enCA.tabs[tab.id]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
