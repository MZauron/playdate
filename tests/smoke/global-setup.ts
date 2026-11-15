// Before the smoke tests: delete the smoke organizer's account, so each run signs up and plans from nothing. Only on a LOCAL database
// (scripts/test-smoke.sh refuses anything else, and so does this). Deleting the account removes its profile, friends and playdates.
import { Client } from "pg";

export const SMOKE_PHONE = "14165550109";

export default async function globalSetup() {
  const url = process.env.KD_DB_URL;
  if (!url) return; // e.g. only the health test, against a server someone else started
  if (!/^postgres(ql)?:\/\/[^@]+@(127\.0\.0\.1|localhost):/.test(url)) throw new Error("Refusing to clean a database that is not local");
  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    await db.query("delete from auth.users where phone = $1", [SMOKE_PHONE]);
  } finally {
    await db.end();
  }
}
