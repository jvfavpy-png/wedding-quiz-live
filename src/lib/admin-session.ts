import { createHmac, timingSafeEqual } from "crypto";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const SESSION_TTL_SEC = 60 * 60 * 12;
const SESSION_VERSION = 1;

interface AdminSessionPayload {
  v: number;
  roomCode: string;
  eventId: string;
  passwordUpdatedAt: string | null;
  exp: number;
}

export interface InternalAdminEvent {
  id: string;
  room_code: string;
  admin_key: string;
  admin_password_updated_at: string | null;
}

function base64Url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(value: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Supabaseのサーバー環境変数が未設定です");
  }

  return createHmac("sha256", secret).update(value).digest("base64url");
}

function verifySignature(value: string, signature: string): boolean {
  const expected = sign(value);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export function adminSessionCookieName(roomCode: string): string {
  return `wql_admin_${roomCode.toUpperCase()}`;
}

export function createAdminSessionToken(event: InternalAdminEvent): string {
  const payload: AdminSessionPayload = {
    v: SESSION_VERSION,
    roomCode: event.room_code,
    eventId: event.id,
    passwordUpdatedAt: event.admin_password_updated_at,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC,
  };
  const encoded = base64Url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function buildAdminSessionCookie(event: InternalAdminEvent): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return [
    `${adminSessionCookieName(event.room_code)}=${createAdminSessionToken(event)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SEC}`,
    secure,
  ]
    .filter(Boolean)
    .join("; ");
}

function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((part) => part.trim());
  const prefix = `${name}=`;
  const cookie = cookies.find((part) => part.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

function parseAdminSessionToken(token: string): AdminSessionPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || !verifySignature(encoded, signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as AdminSessionPayload;
    if (payload.v !== SESSION_VERSION || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function getInternalAdminEvent(roomCode: string): Promise<InternalAdminEvent> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("events")
    .select("id,room_code,admin_key,admin_password_updated_at")
    .eq("room_code", roomCode.toUpperCase())
    .single();

  if (error || !data) {
    throw new Error("イベントが見つかりません");
  }

  return data as InternalAdminEvent;
}

export async function requireAdminSession(request: Request, roomCode: string): Promise<InternalAdminEvent> {
  const normalizedRoomCode = roomCode.toUpperCase();
  const token = readCookie(request, adminSessionCookieName(normalizedRoomCode));
  if (!token) {
    throw new Error("管理者用パスワードの認証が必要です");
  }

  const payload = parseAdminSessionToken(token);
  if (!payload || payload.roomCode !== normalizedRoomCode) {
    throw new Error("管理者用パスワードの認証が必要です");
  }

  const event = await getInternalAdminEvent(normalizedRoomCode);
  if (
    payload.eventId !== event.id ||
    payload.passwordUpdatedAt !== event.admin_password_updated_at
  ) {
    throw new Error("管理者用パスワードの認証が必要です");
  }

  return event;
}
