/** The little circles with each family's first letter (up to five). */
export function Initials({ letters }: { letters: readonly string[] }) {
  return (
    <span aria-hidden="true" className="flex shrink-0 -space-x-2">
      {letters.slice(0, 5).map((letter, i) => (
        <span key={i} className="flex size-7 items-center justify-center rounded-full bg-primary-tint text-[13px] font-semibold text-primary ring-2 ring-card">
          {letter}
        </span>
      ))}
    </span>
  );
}
