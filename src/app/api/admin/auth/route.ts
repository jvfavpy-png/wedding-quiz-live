import { okJson, errorJson, readJsonBody } from "@/lib/api-response";
import { validateAdminPassword } from "@/lib/admin-password";
import { buildAdminSessionCookie, getInternalAdminEvent } from "@/lib/admin-session";
import { getSupabaseAnonServerClient } from "@/lib/supabase/server";

interface AdminAuthBody {
  roomCode: string;
  password?: string;
  legacyKey?: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<AdminAuthBody>(request);
    const roomCode = body.roomCode?.trim().toUpperCase();
    const password = body.password ?? body.legacyKey ?? "";

    if (!roomCode) {
      throw new Error("roomCodeを確認できません");
    }

    validateAdminPassword(password);

    const supabase = getSupabaseAnonServerClient();
    const { error } = await supabase.rpc("admin_verify_password", {
      p_room_code: roomCode,
      p_password: password,
    });

    if (error) {
      throw new Error(error.message);
    }

    const event = await getInternalAdminEvent(roomCode);

    return okJson(
      { ok: true },
      {
        headers: {
          "Set-Cookie": buildAdminSessionCookie(event),
        },
      },
    );
  } catch (error) {
    return errorJson(error, 401);
  }
}
