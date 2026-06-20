import { randomBytes } from "crypto";

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
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  if (request) {
    return new URL(request.url).origin;
  }

  return "http://localhost:3000";
}

export function buildRoomUrls(baseUrl: string, roomCode: string, adminKey: string) {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const encodedRoom = encodeURIComponent(roomCode);
  const encodedKey = encodeURIComponent(adminKey);

  return {
    adminUrl: `${normalizedBase}/admin/${encodedRoom}?key=${encodedKey}`,
    joinUrl: `${normalizedBase}/join/${encodedRoom}`,
    screenUrl: `${normalizedBase}/screen/${encodedRoom}`,
  };
}
