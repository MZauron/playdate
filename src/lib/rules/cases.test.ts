// T02: every case in docs/rules.test-cases.md has exactly one test named by its id, and every test id has a case.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../../..");
const ruleDir = import.meta.dirname;

const caseIds = [...readFileSync(path.join(root, "docs/rules.test-cases.md"), "utf8").matchAll(/^\|\s*(KD-\d{2}[a-z]+)\s*\|/gm)].map((m) => m[1]!);

const testIds = readdirSync(ruleDir)
  .filter((f) => f.endsWith(".test.ts"))
  .flatMap((f) => [...readFileSync(path.join(ruleDir, f), "utf8").matchAll(/\b(?:it|test)\(\s*["'`](KD-\d{2}[a-z]+)\b/g)].map((m) => m[1]!));

const duplicates = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);

describe("rules test cases", () => {
  it("the case file lists cases, each id once", () => {
    expect(caseIds.length).toBeGreaterThan(0);
    expect(duplicates(caseIds)).toEqual([]);
  });
  it("every case has a test", () => {
    expect(caseIds.filter((id) => !testIds.includes(id))).toEqual([]);
  });
  it("every test id is a case, used once", () => {
    expect(testIds.filter((id) => !caseIds.includes(id))).toEqual([]);
    expect(duplicates(testIds)).toEqual([]);
  });
});
