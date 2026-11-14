// T02: src/lib/rules never reads the clock and never does I/O. Callers pass `now` and the zone in.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ALLOWED_IMPORTS = [/^\.\.?\//, /^date-fns(\/|$)/, /^@date-fns\/tz$/];

const CLOCK = [
  /\bDate\.now\s*\(/,
  /\bnew\s+(?:Date|TZDate)\s*\(\s*\)/,
  /\bnew\s+(?:Date|TZDate)\b(?!\s*\()/,
  /\bTZDate\.tz\(\s*[^,()]+\)/,
  /\bperformance\.now\b/,
  /\b(?:isToday|isTomorrow|isYesterday|isPast|isFuture|isThisWeek|isThisMonth|isThisYear|startOfToday|endOfToday|startOfTomorrow|endOfTomorrow|startOfYesterday|endOfYesterday|formatDistanceToNow|formatDistanceToNowStrict)\b/,
];
const IO = [/\bprocess\./, /\bfetch\s*\(/, /\brequire\s*\(/, /\bimport\s*\(/, /\b(?:localStorage|sessionStorage|document|window|navigator)\b/, /\bconsole\./];

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

/** Every problem in one source file: clock reads, I/O, and imports outside the allowed list. */
export function violations(source: string): string[] {
  const code = stripComments(source);
  const found: string[] = [];
  for (const re of [...CLOCK, ...IO]) {
    const m = re.exec(code);
    if (m) found.push(m[0]);
  }
  for (const m of code.matchAll(/\bfrom\s+["']([^"']+)["']|^\s*import\s+["']([^"']+)["']/gm)) {
    const spec = (m[1] ?? m[2])!;
    if (!ALLOWED_IMPORTS.some((re) => re.test(spec))) found.push(`import ${spec}`);
  }
  return found;
}

const ruleDir = import.meta.dirname;
const sources = readdirSync(ruleDir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));

describe("rules are pure", () => {
  it("finds the rule modules", () => {
    expect(sources).toEqual(expect.arrayContaining(["types.ts", "time.ts", "config.ts", "plan.ts", "answers.ts", "confirm.ts", "edit.ts", "picks.ts", "home.ts", "links.ts"]));
  });

  it.each(sources)("%s reads no clock and does no I/O", (file) => {
    expect(violations(readFileSync(path.join(ruleDir, file), "utf8"))).toEqual([]);
  });

  it("catches clock reads, I/O and outside imports", () => {
    const bad = [
      "const a = Date.now();",
      "const b = new Date();",
      "const c = new Date;",
      "const d = new TZDate();",
      "const e = TZDate.tz(zone);",
      "if (isPast(x)) {}",
      "const f = startOfToday();",
      "const g = process.env.TZ;",
      "await fetch(url);",
      'import { db } from "@/lib/db/client";',
      'import fs from "node:fs";',
      'import "server-only";',
      "const h = await import('./x');",
    ];
    for (const line of bad) expect(violations(line), line).not.toEqual([]);
  });

  it("allows passing the clock and zone in", () => {
    const good = [
      'import { TZDate } from "@date-fns/tz";',
      'import { addMinutes } from "date-fns";',
      'import { at } from "./time";',
      "const d = new TZDate(instant, zone);",
      "const e = TZDate.tz(zone, 2026, 10, 16, 9, 0);",
      "const f = new Date(now.getTime() + 1);",
      "// Date.now() is never called here",
    ];
    for (const line of good) expect(violations(line), line).toEqual([]);
  });
});
