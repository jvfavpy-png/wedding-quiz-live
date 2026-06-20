import { okJson, errorJson, readJsonBody } from "@/lib/api-response";
import { validateAdminPasswordConfirmation } from "@/lib/admin-password";
import { buildAdminSessionCookie, getInternalAdminEvent, requireAdminSession } from "@/lib/admin-session";
import { getSupabaseAnonServerClient } from "@/lib/supabase/server";

interface ChangePasswordBody {
  roomCode: string;
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<ChangePasswordBody>(request);
    const roomCode = body.roomCode?.trim().toUpperCase();

    if (!roomCode) {
      throw new Error("roomCodeを確認できません");
    }

    await requireAdminSession(request, roomCode);
    validateAdminPasswordConfirmation(body.newPassword, body.newPasswordConfirm);

    const supabase = getSupabaseAnonServerClient();
    const { error } = await supabase.rpc("admin_change_password", {
      p_room_code: roomCode,
      p_current_password: body.currentPassword,
      p_new_password: body.newPassword,
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
    const status = error instanceof Error && error.message.includes("認証") ? 401 : 400;
    return errorJson(error, status);
  }
}
