import { describe, expect, it } from "vitest";
import { checkFreeStatus, freeOptions, isFreeNow } from "./free";
import { SAT, t } from "./test-fixtures";

// now = Sat 14 Nov 2026, 10:00 in Toronto, unless a case says otherwise.
const SUN = "2026-11-15";
const NEXT_MON = "2026-11-16";
const decide = (when: string, now: Date, words?: string) => {
  const d = checkFreeStatus({ when, words }, now, "America/Toronto");
  return d.ok ? d.value : d.errors.map((e) => e.code);
};

describe("KD-19 free to play", () => {
  it("KD-19a the times offered on Saturday morning", () => {
    expect(freeOptions(t(SAT, 10), "America/Toronto")).toEqual(["this_afternoon", "this_evening", "tomorrow", "this_weekend"]);
  });
  it("KD-19b this afternoon until 16:44, not from 16:45", () => {
    expect(decide("this_afternoon", t(SAT, 16, 44))).toMatchObject({ kind: "this_afternoon", until: t(SAT, 17) });
    expect(decide("this_afternoon", t(SAT, 16, 45))).toEqual(["FREE_NOT_NOW"]);
  });
  it("KD-19c this afternoon, set in the morning, ends at 17:00", () => {
    expect(decide("this_afternoon", t(SAT, 10))).toEqual({ kind: "this_afternoon", words: null, until: t(SAT, 17) });
  });
  it("KD-19d this evening ends at midnight", () => {
    expect(decide("this_evening", t(SAT, 10))).toMatchObject({ until: t(SUN, 0) });
  });
  it("KD-19e tomorrow ends at the end of tomorrow", () => {
    expect(decide("tomorrow", t(SAT, 10))).toMatchObject({ until: t(NEXT_MON, 0) });
  });
  it("KD-19f this weekend, set on Saturday or Sunday, ends at the end of Sunday", () => {
    expect(decide("this_weekend", t(SAT, 10))).toMatchObject({ until: t(NEXT_MON, 0) });
    expect(decide("this_weekend", t(SUN, 10))).toMatchObject({ until: t(NEXT_MON, 0) });
  });
  it("KD-19g this weekend is offered from Friday, and 2 days is the most", () => {
    expect(decide("this_weekend", t("2026-11-19", 23, 59))).toEqual(["FREE_NOT_NOW"]);
    expect(decide("this_weekend", t("2026-11-20", 0))).toMatchObject({ until: t("2026-11-22", 0) });
  });
  it("KD-19h own words are tidied and show for 2 days", () => {
    expect(decide("own_words", t(SAT, 10), "  Free   after school ")).toEqual({ kind: "own_words", words: "Free after school", until: t(NEXT_MON, 10) });
  });
  it("KD-19i own words: 50 characters, 51, blank", () => {
    expect(decide("own_words", t(SAT, 10), "x".repeat(50))).toMatchObject({ words: "x".repeat(50) });
    expect(decide("own_words", t(SAT, 10), "x".repeat(51))).toEqual(["FREE_INVALID"]);
    expect(decide("own_words", t(SAT, 10), "   ")).toEqual(["FREE_INVALID"]);
  });
  it("KD-19j a time that isn't one of the choices", () => {
    expect(decide("next_month", t(SAT, 10))).toEqual(["FREE_INVALID"]);
  });
  it("KD-19k a status shows until it turns off", () => {
    expect(isFreeNow({ until: t(SAT, 17) }, t(SAT, 16, 59))).toBe(true);
    expect(isFreeNow({ until: t(SAT, 17) }, t(SAT, 17))).toBe(false);
  });
  it("KD-19l across the clock change, tomorrow still ends at midnight", () => {
    // Sat 31 Oct 2026 10:00 (daylight time); clocks go back on Sun 1 Nov.
    expect(decide("tomorrow", t("2026-10-31", 10))).toMatchObject({ until: t("2026-11-02", 0) });
    expect(decide("own_words", t("2026-10-31", 10), "Around")).toMatchObject({ until: new Date(t("2026-10-31", 10).getTime() + 48 * 3_600_000) });
  });
});
