// T43: what Or just say it understood waits in an httpOnly cookie for the Plan screen, so the parent's words never go in a URL (and
// so never in a log). Ten minutes, for this parent only; Plan checks it again like anything else from the browser. Server only.
import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { env } from "@/env";
import { secureSite } from "@/lib/auth/session-cookie-options";
import type { SaidPrefill } from "@/lib/domain/say-it";

const COOKIE = "kd_said";

const Stored = z.object({
  parentId: z.string(),
  prefill: z.object({
    friendIds: z.array(z.string()).max(200),
    day: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    start: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    end: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    slots: z
      .array(z.string().regex(/^\d{4}-\d{2}-\d{2}\|(morning|afternoon|evening)$/))
      .max(42)
      .optional(),
    placeName: z.string().max(80).optional(),
    placeAddress: z.string().max(200).optional(),
  }),
});

export async function rememberSaid(parentId: string, prefill: SaidPrefill): Promise<void> {
  (await cookies()).set(COOKIE, JSON.stringify({ parentId, prefill }), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureSite(env.PUBLIC_LINK_BASE),
    path: "/plan",
    maxAge: 10 * 60,
  });
}

/** The prefill for this parent, or null (none, too old, someone else's, or not what Kindred wrote). */
export async function readSaid(parentId: string): Promise<SaidPrefill | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const stored = Stored.safeParse(JSON.parse(raw));
    return stored.success && stored.data.parentId === parentId ? stored.data.prefill : null;
  } catch {
    return null;
  }
}

/** Only from a server action or route handler (pages can't change cookies). */
export async function forgetSaid(): Promise<void> {
  (await cookies()).delete({ name: COOKIE, path: "/plan" });
}
