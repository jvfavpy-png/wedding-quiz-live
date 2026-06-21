import { okJson, errorJson } from "@/lib/api-response";
import { getSupabaseAnonServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
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

    const ranking = (data ?? []) as unknown as RankingEntry[];
    if (ranking.length === 0) {
      return okJson([]);
    }

    const service = getSupabaseServiceClient();
    const { data: participants } = await service
      .from("participants")
      .select("id,avatar_url")
      .in("id", ranking.map((entry) => entry.participantId));
    const avatarById = new Map((participants ?? []).map((participant) => [participant.id, participant.avatar_url]));

    return okJson(
      ranking.map((entry) => ({
        ...entry,
        avatarUrl: avatarById.get(entry.participantId) ?? null,
      })),
    );
  } catch (error) {
    return errorJson(error);
  }
}
