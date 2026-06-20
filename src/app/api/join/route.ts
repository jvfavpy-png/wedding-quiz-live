import { okJson, errorJson, readJsonBody } from "@/lib/api-response";
import { getSupabaseAnonServerClient } from "@/lib/supabase/server";
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
    return okJson({
      ...participant,
      participantToken: body.participantToken,
    } satisfies ParticipantSession);
  } catch (error) {
    return errorJson(error);
  }
}
