// KD-14: one link per invite. The token is 128 random bits (22 characters of base64url); only its sha256 is stored, so the
// database alone can never rebuild a link. The token itself exists only while the organizer's Text buttons are on screen.
import { createHash, randomBytes } from "node:crypto";

export const TOKEN_BYTES = 16;

/** The value stored in `invites.token_hash` (hex sha256), and what the invite page looks a token up by. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function newInviteToken(random: (bytes: number) => Buffer = randomBytes): { token: string; tokenHash: string } {
  const token = random(TOKEN_BYTES).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

/** `${base}/r/${token}`: the same page for every friend, with or without Kindred. */
export function inviteLink(base: string, token: string): string {
  return `${base}/r/${token}`;
}
