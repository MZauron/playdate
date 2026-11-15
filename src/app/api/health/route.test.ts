import { describe, expect, it, vi } from "vitest";

let fails = false;
vi.mock("@/lib/db/admin", () => ({
  adminClient: () => ({
    from: () => ({ select: () => ({ limit: async () => (fails ? { error: { code: "08006" } } : { error: null }) }) }),
  }),
}));

const { GET } = await import("./route");

describe("GET /api/health", () => {
  it("answers ok when the database is reachable", async () => {
    fails = false;
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, database: "reachable" });
  });
  it("answers 503 when it is not, without any detail", async () => {
    fails = true;
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, database: "unreachable" });
  });
});
