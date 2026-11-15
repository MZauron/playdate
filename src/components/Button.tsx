import Link from "next/link";
import { cx } from "./cx";

export type ButtonVariant = "main" | "secondary" | "destructive";

// 50 px tall, 14 px corners. Coral is for the ONE main action per screen; secondary is teal on its tint; destructive is a red outline.
const variants: Record<ButtonVariant, string> = {
  main: "bg-accent text-white",
  secondary: "bg-primary-tint text-primary",
  destructive: "border border-danger bg-transparent text-danger",
};

const base =
  "inline-flex min-w-11 items-center justify-center rounded-button px-5 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

type Common = { variant?: ButtonVariant; fullWidth?: boolean; /** 44 px instead of 50: for buttons inside a list row. Never smaller. */ compact?: boolean };

const height = (compact?: boolean) => (compact ? "h-11" : "h-[50px]");

export function Button({ variant = "secondary", fullWidth, compact, className, type = "button", ...rest }: Common & React.ComponentPropsWithoutRef<"button">) {
  return <button type={type} className={cx(base, height(compact), variants[variant], fullWidth && "w-full", className)} {...rest} />;
}

/** The same look for a link that goes to another screen. */
export function ButtonLink({ variant = "secondary", fullWidth, compact, className, ...rest }: Common & React.ComponentProps<typeof Link>) {
  return <Link className={cx(base, height(compact), variants[variant], fullWidth && "w-full", className)} {...rest} />;
}
