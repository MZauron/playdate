// Phone numbers: typed by people, stored as E.164 ("+14165550111"), hashed for matching (CLAUDE.md "Conventions", Q10: +1 only at launch).
import { createHmac } from "node:crypto";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const E164 = /^\+[1-9][0-9]{7,14}$/;

/** A Canadian or US number as a person types it ("(416) 555-0101", "416-555-0101", "+1 416 555 0101"), as E.164; null for anything else. */
export function parsePhone(input: string): string | null {
  const parsed = parsePhoneNumberFromString(input, "CA");
  if (!parsed || !parsed.isValid() || parsed.countryCallingCode !== "1") return null;
  return parsed.number;
}

/** "(416) 555-0101" for a +1 number; anything else as stored. */
export function formatPhone(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}

/** "(•••) •••-0101": enough to recognise the number, not enough to read it off a screen. */
export function maskedPhone(e164: string): string {
  const m = /^\+1\d{3}\d{3}(\d{4})$/.exec(e164);
  return m ? `(•••) •••-${m[1]}` : `${e164.slice(0, -4).replace(/\d/g, "•")}${e164.slice(-4)}`;
}

/** Logs get the last 4 digits only (CLAUDE.md "Logging"). */
export function maskPhoneForLog(phone: string): string {
  return `***${phone.slice(-4)}`;
}

/** Supabase stores phones without the "+" ("14165550101"); the app uses E.164. Null if it is not a valid E.164 number. */
export function toE164(raw: string): string | null {
  const phone = raw.startsWith("+") ? raw : `+${raw}`;
  return E164.test(phone) ? phone : null;
}

/** HMAC-SHA256 (hex) of an E.164 number under PHONE_HASH_KEY: `profiles.phone_hash`, `friends.phone_hash`. The same number always gives the same hash. */
export function phoneHash(key: string, e164: string): string {
  return createHmac("sha256", key).update(e164).digest("hex");
}
