import { cx } from "./cx";

/** White surface, 16 px corners, soft shadow, no border (DESIGN.md "Visual design"). */
export function Card({ className, ...rest }: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cx("rounded-card bg-card p-4 shadow-card", className)} {...rest} />;
}
