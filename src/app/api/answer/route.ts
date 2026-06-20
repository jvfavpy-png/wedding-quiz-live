import { okJson, errorJson, readJsonBody } from "@/lib/api-response";
import { getSupabaseAnonServerClient } from "@/lib/supabase/server";

interface AnswerBody {
  roomCode: string;
  participantId: string;
  participantToken: string;
  questionId: string;
  selectedIndex: number;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<AnswerBody>(request);
    const supabase = getSupabaseAnonServerClient();
    const { data, error } = await supabase.rpc("submit_answer", {
      p_room_code: body.roomCode,
      p_participant_id: body.participantId,
      p_participant_token: body.participantToken,
      p_question_id: body.questionId,
      p_selected_index: body.selectedIndex,
    });

    if (error) {
      throw new Error(error.message);
    }

    return okJson(data);
  } catch (error) {
    return errorJson(error);
  }
}
