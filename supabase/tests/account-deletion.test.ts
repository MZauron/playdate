// Found by T03: what happens today when an invited parent with Kindred deletes their account. It documents current
// behaviour so a later migration (T24, "delete my account") changes it on purpose; see docs/NEXT.md T24.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildWorld, closeDb, destroyWorld, enabled, failure, q, type World } from "./helpers";

describe.skipIf(!enabled)("deleting an invitee's account", () => {
  let w: World;
  beforeAll(async () => {
    w = await buildWorld();
  });
  afterAll(async () => {
    if (w) await destroyWorld(w);
    await closeDb();
  });

  it("is refused while they hold an app invite (set null breaks the app-invite check)", async () => {
    const result = await failure(q("delete from auth.users where id = $1", [w.dev]));
    expect(result?.code).toBe("23514");
  });
});
