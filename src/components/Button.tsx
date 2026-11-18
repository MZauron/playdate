import Link from "next/link";
import { cx } from "./cx";

export type ButtonVariant = "main" | "secondary" | "destructive";

// 52 px tall pills (T36, the mock-up). Coral is for the ONE main action per screen; secondary is teal on its tint; destructive is a red outline.
const variants: Record<ButtonVariant, string> = {
  main: "bg-accent text-white",
  secondary: "bg-primary-tint text-primary",
  destructive: "border border-danger bg-transparent text-danger",
};

const base =
  "inline-flex min-w-11 items-center justify-center rounded-full px-5 text-base font-bold tracking-tight disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

type Common = { variant?: ButtonVariant; fullWidth?: boolean; /** 44 px instead of 52: for buttons inside a list row. Never smaller. */ compact?: boolean };

const height = (compact?: boolean) => (compact ? "h-11" : "h-[52px]");

export function Button({ variant = "secondary", fullWidth, compact, className, type = "button", ...rest }: Common & React.ComponentProps<"button">) {
  return <button type={type} className={cx(base, height(compact), variants[variant], fullWidth && "w-full", className)} {...rest} />;
}

/** The same look for a link that goes to another screen. */
export function ButtonLink({ variant = "secondary", fullWidth, compact, className, ...rest }: Common & React.ComponentProps<typeof Link>) {
  return <Link className={cx(base, height(compact), variants[variant], fullWidth && "w-full", className)} {...rest} />;
}
