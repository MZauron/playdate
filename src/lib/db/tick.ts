// The cron tick's store (T14 KD-12; T23 adds the clean-up). Server only, service role; it runs for every organizer, so it reads only
// what each step needs and writes only the stamps and clean-ups those steps own.
import "server-only";
import type { TickPlaydate, TickStore } from "@/lib/domain/majority";
import type { AnswerKind, InviteChannel } from "@/lib/rules/types";
import { adminClient } from "./admin";

type Row = {
  id: string;
  time_version: number;
  invites: {
    id: string;
    channel: InviteChannel;
    majority_notice_at: string | null;
    friends: { parent_name: string } | null;
    answers: { kind: AnswerKind; pick_start_at: string | null; pick_end_at: string | null; time_version: number } | null;
  }[];
};

export const tickStore: TickStore = {
  async openAvailabilityPlaydates(now) {
    const { data, error } = await adminClient()
      .from("playdates")
      .select("id, time_version, invites(id, channel, majority_notice_at, friends(parent_name), answers(kind, pick_start_at, pick_end_at, time_version))")
      .eq("mode", "availability")
      .eq("status", "collecting")
      .gt("links_expire_at", now.toISOString())
      .overrideTypes<Row[], { merge: false }>();
    if (error) throw new Error(`openAvailabilityPlaydates failed: ${error.code}`);
    return (data ?? []).map(
      (p): TickPlaydate => ({
        id: p.id,
        invites: p.invites.map((i) => {
          const a = i.answers && i.answers.time_version === p.time_version && i.answers.kind === "pick" ? i.answers : null;
          return {
            id: i.id,
            channel: i.channel,
            majorityNoticeAt: i.majority_notice_at ? new Date(i.majority_notice_at) : null,
            firstName: (i.friends?.parent_name ?? "").trim().split(/\s+/)[0] ?? "",
            pick: a?.pick_start_at && a.pick_end_at ? { start: new Date(a.pick_start_at), end: new Date(a.pick_end_at) } : null,
          };
        }),
      }),
    );
  },

  async stampMajorityNotice(inviteIds, at) {
    const { data, error } = await adminClient()
      .from("invites")
      .update({ majority_notice_at: at.toISOString() })
      .in("id", [...inviteIds])
      .is("majority_notice_at", null) // once ever (KD-12)
      .select("id");
    if (error) throw new Error(`stampMajorityNotice failed: ${error.code}`);
    return data?.length ?? 0;
  },
};
