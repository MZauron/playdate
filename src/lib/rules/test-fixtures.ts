// Shared fixtures for the rule tests (docs/rules.test-cases.md header). Pure, no clock.
import { at } from "./time";
import type { Range } from "./types";

export const ZONE = "America/Toronto";
export const SAT = "2026-11-14";
export const MON = "2026-11-16";
export const WED = "2026-11-18";

/** now = Sat 14 Nov 2026, 10:00 in Toronto. */
export const NOW = at(SAT, 10, 0, ZONE);

export const t = (day: string, hour: number, minute = 0, zone = ZONE) => at(day, hour, minute, zone);
export const range = (day: string, from: [number, number], until: [number, number], zone = ZONE): Range => ({
  start: at(day, from[0], from[1], zone),
  end: at(day, until[0], until[1], zone),
});
