"use client";

import { usePathname } from "next/navigation";
import { BottomTabs, TABS } from "./BottomTabs";

/** BottomTabs with the active tab read from the address. */
export function AppTabs() {
  const pathname = usePathname() ?? "/";
  const active = TABS.find((t) => (t.href === "/" ? pathname === "/" : pathname === t.href || pathname.startsWith(`${t.href}/`)));
  return <BottomTabs active={active?.id ?? null} />;
}
