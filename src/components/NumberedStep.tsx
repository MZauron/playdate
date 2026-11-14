import { cx } from "./cx";

/** A step of the planning screen: a coral numbered circle that turns into a teal tick when done. */
export function NumberedStep({ number, done = false, title, children }: { number: number; done?: boolean; title: string; children?: React.ReactNode }) {
  return (
    <section className="flex gap-3" aria-labelledby={`step-${number}`}>
      <span
        aria-hidden="true"
        data-done={done}
        className={cx("flex size-8 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white", done ? "bg-primary" : "bg-accent")}
      >
        {done ? "✓" : number}
      </span>
      <div className="min-w-0 flex-1">
        <h2 id={`step-${number}`} className="flex min-h-8 items-center text-base font-semibold">
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}
