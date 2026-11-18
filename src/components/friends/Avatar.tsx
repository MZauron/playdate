// T40: a round avatar with a parent's initials, its colour picked from the name so it stays the same everywhere (the mock-up's).
const COLOURS = ["#35746E", "#DF6D52", "#2E5E7E", "#B07800", "#2E86DE", "#D6336C", "#2E7D32", "#8D6E63"] as const;

export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

export function colourOf(name: string): string {
  let h = 7;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLOURS[h % COLOURS.length]!;
}

/** Decorative: the name is always written next to it. */
export function Avatar({ name, size = 42 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36), background: colourOf(name) }}
    >
      {initialsOf(name)}
    </span>
  );
}
