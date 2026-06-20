import { okJson, errorJson } from "@/lib/api-response";
import { getSupabaseAnonServerClient } from "@/lib/supabase/server";
import type { AdminSnapshot } from "@/types/quiz";

export async function GET(
  request: Request,
  context: { params: Promise<{ roomCode: string }> },
): Promise<Response> {
  try {
    const { roomCode } = await context.params;
    const adminKey = new URL(request.url).searchParams.get("key") ?? "";

    if (!adminKey) {
      return errorJson("管理キーが必要です", 403);
    }

    const supabase = getSupabaseAnonServerClient();
    const { data, error } = await supabase.rpc("get_admin_room_snapshot", {
      p_room_code: roomCode,
      p_admin_key: adminKey,
    });

    if (error) {
      return errorJson(error.message, error.message.includes("管理キー") ? 403 : 400);
    }

    return okJson(data as unknown as AdminSnapshot);
  } catch (error) {
    return errorJson(error);
  }
}
