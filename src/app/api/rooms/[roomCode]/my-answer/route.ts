import { okJson, errorJson, readJsonBody } from "@/lib/api-response";
import { getSupabaseAnonServerClient } from "@/lib/supabase/server";
import type { MyAnswer } from "@/types/quiz";

interface MyAnswerBody {
  participantId: string;
  participantToken: string;
  questionId: string;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ roomCode: string }> },
): Promise<Response> {
  try {
    const { roomCode } = await context.params;
    const body = await readJsonBody<MyAnswerBody>(request);
    const supabase = getSupabaseAnonServerClient();
    const { data, error } = await supabase.rpc("get_my_answer", {
      p_room_code: roomCode,
      p_participant_id: body.participantId,
      p_participant_token: body.participantToken,
      p_question_id: body.questionId,
    });

    if (error) {
      throw new Error(error.message);
    }

    return okJson(data as unknown as MyAnswer | null);
  } catch (error) {
    return errorJson(error);
  }
}
