import { ButtonLink } from "@/components/Button";
import { TextButtons } from "@/components/TextButtons";
import type { TextToSend } from "@/lib/domain/playdates";
import { enCA } from "@/lib/i18n/en-CA";

const t = enCA.plan;

/** After Send invite: one Text button per family (Q3), with that family's own link in the text. */
export function SentView({ texts }: { texts: TextToSend[] }) {
  return (
    <div className="flex flex-col gap-5 pb-6 pt-4">
      <h1 className="text-title font-bold leading-tight">{t.sentTitle}</h1>
      <p className="text-muted">{t.sentNote}</p>
      <TextButtons texts={texts.map((x) => ({ key: x.friendId, name: x.name, label: x.label, channel: x.channel, href: x.href }))} />
      <ButtonLink href="/" fullWidth>
        {t.backHome}
      </ButtonLink>
    </div>
  );
}
