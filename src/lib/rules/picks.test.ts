import { describe, expect, it } from "vitest";
import { groupPicks, majorityNotices, type NoticePick } from "./picks";
import { MON, NOW, range } from "./test-fixtures";

const morning = range(MON, [9, 0], [12, 0]);
const early = range(MON, [13, 0], [14, 0]);

describe("KD-11 everyone's picks", () => {
  it("KD-11a grouped by range, most families first", () => {
    const groups = groupPicks([
      { inviteId: "I1", firstName: "Dev", range: morning },
      { inviteId: "I2", firstName: "Maya", range: morning },
      { inviteId: "I3", firstName: "Aisha", range: early },
    ]);
    expect(groups).toEqual([
      { range: morning, firstNames: ["Dev", "Maya"], families: 2, mostPicked: true },
      { range: early, firstNames: ["Aisha"], families: 1, mostPicked: false },
    ]);
  });
  it("KD-11b a tie goes to the earliest", () => {
    const nineToTen = range(MON, [9, 0], [10, 0]);
    const groups = groupPicks([
      { inviteId: "I1", firstName: "Dev", range: early },
      { inviteId: "I2", firstName: "Maya", range: nineToTen },
    ]);
    expect(groups.map((g) => [g.firstNames[0], g.mostPicked])).toEqual([
      ["Maya", true],
      ["Dev", false],
    ]);
  });
  it("KD-11c no picks", () => {
    expect(groupPicks([])).toEqual([]);
  });
});

const picks = (aisha: Partial<NoticePick> = {}): NoticePick[] => [
  { inviteId: "I1", firstName: "Dev", range: morning, channel: "app", majorityNoticeAt: null },
  { inviteId: "I2", firstName: "Maya", range: morning, channel: "text", majorityNoticeAt: null },
  { inviteId: "I3", firstName: "Aisha", range: early, channel: "text", majorityNoticeAt: null, ...aisha },
];

describe("KD-12 majority notice", () => {
  it("KD-12a the text friend with a different pick", () => {
    expect(majorityNotices(picks())).toEqual({ inviteIds: ["I3"], range: morning });
  });
  it("KD-12b once ever", () => {
    expect(majorityNotices(picks({ majorityNoticeAt: NOW })).inviteIds).toEqual([]);
  });
  it("KD-12c no range with two families", () => {
    const one = picks().filter((p) => p.inviteId !== "I2");
    expect(majorityNotices(one).inviteIds).toEqual([]);
  });
  it("KD-12d text friends only", () => {
    expect(majorityNotices(picks({ channel: "app" })).inviteIds).toEqual([]);
  });
  it("KD-12e everyone picked the majority range", () => {
    expect(majorityNotices(picks({ range: morning })).inviteIds).toEqual([]);
  });
});
