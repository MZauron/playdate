import { cx } from "./cx";

const inputClass =
  "block h-12 w-full rounded-xl bg-card px-4 text-base text-ink ring-1 ring-border placeholder:text-muted focus-visible:outline-2 focus-visible:outline-primary aria-[invalid=true]:ring-danger";

/** A labelled text box (48 px tall) with its short error message underneath. */
export function Field({ id, label, error, hint, className, ...input }: { id: string; label: string; error?: string; hint?: string } & Omit<React.ComponentPropsWithoutRef<"input">, "id">) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">
        {label}
      </label>
      <input id={id} className={inputClass} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} {...input} />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-[15px] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[15px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** A 48 px drop-down, same look as the text box. */
export function SelectField({ id, label, error, className, children, ...select }: { id: string; label: string; error?: string } & Omit<React.ComponentPropsWithoutRef<"select">, "id">) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">
        {label}
      </label>
      <select id={id} className={cx(inputClass, "appearance-auto")} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} {...select}>
        {children}
      </select>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[15px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
