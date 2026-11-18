import { describe, expect, it } from "vitest";
import { friendsForKids, knownKids } from "./friend-kids";

const MIA = { id: "mia" };
const ETHAN = { id: "ethan" };
const KIDS = [MIA, ETHAN];

describe("which of your kids a friend knows (T42, Q30)", () => {
  it("is what was saved, in the parent's order, else the first child", () => {
    expect(knownKids({ childIds: ["ethan", "mia"] }, KIDS)).toEqual(["mia", "ethan"]);
    expect(knownKids({ childIds: [] }, KIDS)).toEqual(["mia"]);
    expect(knownKids({}, KIDS)).toEqual(["mia"]);
    expect(knownKids({ childIds: ["removed-child"] }, KIDS)).toEqual(["mia"]);
    expect(knownKids({}, [])).toEqual([]);
  });
  it("puts the friends of the chosen children first, the rest after, each in list order", () => {
    const dev = { id: "dev", childIds: ["ethan"] };
    const maya: { id: string; childIds?: string[] } = { id: "maya" }; // Mia's by default
    const priya = { id: "priya", childIds: ["mia", "ethan"] };
    expect(friendsForKids([dev, maya, priya], KIDS, ["ethan"])).toEqual({ first: [dev, priya], rest: [maya] });
    expect(friendsForKids([dev, maya, priya], KIDS, ["mia"])).toEqual({ first: [maya, priya], rest: [dev] });
  });
  it("leaves the list alone with one child or nobody chosen", () => {
    const dev = { id: "dev", childIds: ["ethan"] };
    expect(friendsForKids([dev], KIDS, [])).toEqual({ first: [dev], rest: [] });
    expect(friendsForKids([dev], [MIA], ["mia"])).toEqual({ first: [dev], rest: [] });
  });
});
