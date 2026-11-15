// The cron service's key check for /api/cron/tick.
import { timingSafeEqual } from "node:crypto";

/** True only for exactly "Bearer <secret>", compared in constant time; never when no secret is set. */
export function cronAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
