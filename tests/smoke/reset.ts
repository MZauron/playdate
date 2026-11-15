// Before each attempt of the loop test (retries included): delete the smoke organizer's account, so it signs up and plans from
// nothing. Only on a LOCAL database (scripts/test-smoke.sh refuses anything else, and so does this). Deleting the account removes its
// profile, friends and playdates.
import { Client } from "pg";

/** The first attempt signs up 0109; a retry uses 0108, because the sign-in code limit allows one code per number per minute. */
export const smokePhone = (retry: number) => (retry === 0 ? "14165550109" : "14165550108");

export async function resetSmokeAccount(phone: string): Promise<void> {
  const url = process.env.KD_DB_URL;
  if (!url) throw new Error("KD_DB_URL is not set: run the smoke tests with `npm run test:smoke`");
  if (!/^postgres(ql)?:\/\/[^@]+@(127\.0\.0\.1|localhost):/.test(url)) throw new Error("Refusing to clean a database that is not local");
  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    await db.query("delete from auth.users where phone = $1", [phone]);
  } finally {
    await db.end();
  }
}
