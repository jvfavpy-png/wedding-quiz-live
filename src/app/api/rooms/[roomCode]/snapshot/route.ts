import { okJson, errorJson } from "@/lib/api-response";
import { getSupabaseAnonServerClient } from "@/lib/supabase/server";
import type { RoomSnapshot } from "@/types/quiz";

export async function GET(
  _request: Request,
  context: { params: Promise<{ roomCode: string }> },
): Promise<Response> {
  try {
    const { roomCode } = await context.params;
    const supabase = getSupabaseAnonServerClient();
    const { data, error } = await supabase.rpc("get_room_snapshot", {
      p_room_code: roomCode,
    });

    if (error) {
      throw new Error(error.message);
    }

    return okJson(data as unknown as RoomSnapshot);
  } catch (error) {
    return errorJson(error);
  }
}
