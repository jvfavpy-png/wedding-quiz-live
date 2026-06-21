import { okJson, errorJson, readJsonBody } from "@/lib/api-response";
import { getSupabaseAnonServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import type { ParticipantSession } from "@/types/quiz";

interface JoinBody {
  roomCode: string;
  name: string;
  participantToken: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<JoinBody>(request);
    const supabase = getSupabaseAnonServerClient();
    const { data, error } = await supabase.rpc("join_event", {
      p_room_code: body.roomCode,
      p_name: body.name,
      p_participant_token: body.participantToken,
    });

    if (error) {
      throw new Error(error.message);
    }

    const participant = data as unknown as Omit<ParticipantSession, "participantToken">;
    const service = getSupabaseServiceClient();
    const { data: eventRow } = await service
      .from("events")
      .select("id")
      .eq("room_code", body.roomCode.toUpperCase())
      .maybeSingle();

    const [{ data: participantRow }, { count: duplicateCount }] = await Promise.all([
      service
        .from("participants")
        .select("avatar_url")
        .eq("id", participant.participantId)
        .maybeSingle(),
      eventRow
        ? service
            .from("participants")
            .select("id", { count: "exact", head: true })
            .eq("event_id", eventRow.id)
            .eq("name", participant.name)
        : Promise.resolve({ count: 0 }),
    ]);

    return okJson({
      ...participant,
      participantToken: body.participantToken,
      avatarUrl: participantRow?.avatar_url ?? null,
      duplicateNameCount: duplicateCount ?? 0,
    } satisfies ParticipantSession);
  } catch (error) {
    return errorJson(error);
  }
}
