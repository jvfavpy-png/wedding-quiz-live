import { okJson, errorJson } from "@/lib/api-response";
import { requireAdminSession } from "@/lib/admin-session";
import { getSupabaseAnonServerClient } from "@/lib/supabase/server";
import type { AdminSnapshot } from "@/types/quiz";

export async function GET(
  request: Request,
  context: { params: Promise<{ roomCode: string }> },
): Promise<Response> {
  try {
    const { roomCode } = await context.params;
    const event = await requireAdminSession(request, roomCode);

    const supabase = getSupabaseAnonServerClient();
    const { data, error } = await supabase.rpc("get_admin_room_snapshot", {
      p_room_code: roomCode,
      p_admin_key: event.admin_key,
    });

    if (error) {
      return errorJson(error.message, 400);
    }

    return okJson(data as unknown as AdminSnapshot);
  } catch (error) {
    const status = error instanceof Error && error.message.includes("認証") ? 401 : 400;
    return errorJson(error, status);
  }
}
