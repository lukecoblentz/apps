import { randomBytes } from "crypto";

/** URL-safe code for invite links; retry on rare DB unique collision. */
export function generateInviteCode(): string {
  return randomBytes(9).toString("base64url").replace(/=/g, "").slice(0, 12);
}
