import { okJson, errorJson } from "@/lib/api-response";
import { getSupabaseAnonServerClient } from "@/lib/supabase/server";
import type { RankingEntry } from "@/types/quiz";

export async function GET(
  _request: Request,
  context: { params: Promise<{ roomCode: string }> },
): Promise<Response> {
  try {
    const { roomCode } = await context.params;
    const supabase = getSupabaseAnonServerClient();
    const { data, error } = await supabase.rpc("get_ranking", {
      p_room_code: roomCode,
    });

    if (error) {
      throw new Error(error.message);
    }

    return okJson((data ?? []) as unknown as RankingEntry[]);
  } catch (error) {
    return errorJson(error);
  }
}
