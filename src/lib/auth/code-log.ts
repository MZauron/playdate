// When a code was last sent to each phone, in this process's memory (the app is ONE Railway service; a restart forgets it, which only
// lets someone through). Feeds `decideLoginCode` (login-code-limit.ts): Supabase only enforces a 60 s resend and a project-wide hourly cap.
const HOUR_MS = 60 * 60 * 1000;

export type CodeLog = {
  sentAt(phoneE164: string, nowMs: number): number[];
  record(phoneE164: string, nowMs: number): void;
};

export function createCodeLog(maxPhones = 5_000): CodeLog {
  const log = new Map<string, number[]>();
  return {
    sentAt(phone, nowMs) {
      return (log.get(phone) ?? []).filter((t) => nowMs - t < HOUR_MS);
    },
    record(phone, nowMs) {
      const recent = (log.get(phone) ?? []).filter((t) => nowMs - t < HOUR_MS);
      recent.push(nowMs);
      log.delete(phone);
      log.set(phone, recent);
      while (log.size > maxPhones) log.delete(log.keys().next().value as string);
    },
  };
}
