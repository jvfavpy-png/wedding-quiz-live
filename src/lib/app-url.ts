const LOCAL_APP_URL = "http://localhost:3000";

export interface ResolveAppBaseUrlOptions {
  requestUrl?: string;
  windowOrigin?: string;
}

export function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/$/, "");
}

export function resolveAppBaseUrl(options: ResolveAppBaseUrlOptions = {}): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) {
    return normalizeBaseUrl(envUrl);
  }

  if (options.windowOrigin?.trim()) {
    return normalizeBaseUrl(options.windowOrigin);
  }

  if (options.requestUrl) {
    return new URL(options.requestUrl).origin;
  }

  return LOCAL_APP_URL;
}

export function buildPublicRoomUrls(baseUrl: string, roomCode: string) {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const encodedRoom = encodeURIComponent(roomCode);

  return {
    adminUrl: `${normalizedBase}/admin/${encodedRoom}`,
    joinUrl: `${normalizedBase}/join/${encodedRoom}`,
    screenUrl: `${normalizedBase}/screen/${encodedRoom}`,
  };
}
