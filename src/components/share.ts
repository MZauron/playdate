// Sharing a text from the organizer's own phone (Q26, T33). Kindred keeps no friend's number, so the phone does the rest: its share
// sheet (Messages, WhatsApp…), where the parent picks the person from their own contacts. Where there is no share sheet (a laptop
// browser, or a page served over plain http, which hides it), the text is copied, or Messages opens with the text and no one in To.

export type ShareResult = "shared" | "copied" | "opened" | "cancelled";

export async function shareText(text: string): Promise<ShareResult> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled"; // closed the sheet: nothing sent
      // Anything else (not allowed here): fall through to the next way.
    }
  }
  if (typeof window !== "undefined" && window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch {}
  }
  window.location.href = smsWithoutNumber(text);
  return "opened";
}

/** Messages with the text filled in and nobody in To: `sms:?&body=` is the form both iPhone and Android accept. */
export function smsWithoutNumber(text: string): string {
  return `sms:?&body=${encodeURIComponent(text)}`;
}
