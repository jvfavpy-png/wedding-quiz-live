import { randomBytes } from "crypto";
import { buildPublicRoomUrls, resolveAppBaseUrl } from "@/lib/app-url";

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(length = 6): string {
  const bytes = randomBytes(length);
  return Array.from(bytes)
    .map((byte) => ROOM_ALPHABET[byte % ROOM_ALPHABET.length])
    .join("");
}

export function generateAdminKey(): string {
  return randomBytes(24).toString("base64url");
}

export function getAppBaseUrl(request?: Request): string {
  return resolveAppBaseUrl({ requestUrl: request?.url });
}

export function buildRoomUrls(baseUrl: string, roomCode: string) {
  return buildPublicRoomUrls(baseUrl, roomCode);
}
