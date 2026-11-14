import { friendStatusLabel } from "@/lib/i18n/en-CA";
import type { FriendStatus } from "@/lib/rules/answers";
import { cx } from "./cx";

export type Tone = "success" | "danger" | "muted" | "purple";

const tones: Record<Tone, string> = {
  success: "text-success",
  danger: "text-danger",
  muted: "text-muted",
  purple: "text-purple",
};

/** Coloured words, not a badge (DESIGN.md "Visual design"). */
export function StatusLine({ tone, className, ...rest }: { tone: Tone } & React.ComponentPropsWithoutRef<"p">) {
  return <p className={cx("text-[15px] font-medium", tones[tone], className)} {...rest} />;
}

const toneOf: Record<FriendStatus["status"], Tone> = { coming: "success", responded: "success", cant_make_it: "danger", waiting: "muted" };

/** KD-08: one friend's status line (Coming, Responded, Can't make it · reason, Waiting). */
export function FriendStatusLine({ status, className }: { status: FriendStatus; className?: string }) {
  return (
    <StatusLine tone={toneOf[status.status]} className={className}>
      {friendStatusLabel(status)}
    </StatusLine>
  );
}
