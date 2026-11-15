import { InviteMessage } from "@/components/invite/InviteShell";
import { enCA } from "@/lib/i18n/en-CA";

export default function InviteNotFound() {
  return <InviteMessage title={enCA.invite.notFoundTitle} note={enCA.invite.notFoundNote} />;
}
