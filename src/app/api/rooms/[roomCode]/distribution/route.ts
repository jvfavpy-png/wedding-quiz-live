import { okJson, errorJson } from "@/lib/api-response";
import { getSupabaseAnonServerClient } from "@/lib/supabase/server";
import type { AnswerDistribution } from "@/types/quiz";

export async function GET(
  request: Request,
  context: { params: Promise<{ roomCode: string }> },
): Promise<Response> {
  try {
    const { roomCode } = await context.params;
    const questionId = new URL(request.url).searchParams.get("questionId");
    const supabase = getSupabaseAnonServerClient();
    const { data, error } = await supabase.rpc("get_answer_distribution", {
      p_room_code: roomCode,
      p_question_id: questionId,
    });

    if (error) {
      throw new Error(error.message);
    }

    return okJson(data as unknown as AnswerDistribution);
  } catch (error) {
    return errorJson(error);
  }
}
