import { cx } from "./cx";

/** A pill the parent can tap: reason chips, quick place chips, favourites. Selected = teal on its tint. 44 px tall. */
export function Chip({ selected = false, className, type = "button", ...rest }: { selected?: boolean } & React.ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cx(
        "inline-flex min-h-11 items-center rounded-full px-4 text-[15px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        selected ? "bg-primary-tint text-primary ring-1 ring-primary" : "bg-card text-ink shadow-card",
        className,
      )}
      {...rest}
    />
  );
}
