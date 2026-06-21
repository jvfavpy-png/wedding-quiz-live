import { okJson, errorJson, readJsonBody } from "@/lib/api-response";
import { requireAdminSession } from "@/lib/admin-session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

type ParticipantAction = "rename" | "reset_score" | "reset_all_scores" | "delete";

interface ParticipantActionBody {
  roomCode: string;
  action: ParticipantAction;
  participantId?: string;
  name?: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<ParticipantActionBody>(request);
    const event = await requireAdminSession(request, body.roomCode);
    const supabase = getSupabaseServiceClient();

    if (body.action === "rename") {
      const name = body.name?.trim().slice(0, 20);
      if (!body.participantId || !name) {
        throw new Error("参加者名を入力してください。");
      }

      const { error } = await supabase
        .from("participants")
        .update({ name, last_seen_at: new Date().toISOString() })
        .eq("event_id", event.id)
        .eq("id", body.participantId);

      if (error) {
        throw new Error(error.message);
      }
    } else if (body.action === "reset_score") {
      if (!body.participantId) {
        throw new Error("参加者を選択してください。");
      }

      const { error } = await supabase
        .from("participants")
        .update({ score: 0 })
        .eq("event_id", event.id)
        .eq("id", body.participantId);

      if (error) {
        throw new Error(error.message);
      }
    } else if (body.action === "reset_all_scores") {
      const { error } = await supabase
        .from("participants")
        .update({ score: 0 })
        .eq("event_id", event.id);

      if (error) {
        throw new Error(error.message);
      }
    } else if (body.action === "delete") {
      if (!body.participantId) {
        throw new Error("参加者を選択してください。");
      }

      const { error } = await supabase
        .from("participants")
        .delete()
        .eq("event_id", event.id)
        .eq("id", body.participantId);

      if (error) {
        throw new Error(error.message);
      }

      await recalculateEventStats(event.id);
    } else {
      throw new Error("対応していない操作です。");
    }

    return okJson({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message.includes("認証") || message.includes("隱崎ｨｼ") ? 401 : 400;
    return errorJson(error, status);
  }
}

async function recalculateEventStats(eventId: string): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const [participantsResult, questionsResult, answersResult] = await Promise.all([
    supabase.from("participants").select("id").eq("event_id", eventId),
    supabase.from("questions").select("id").eq("event_id", eventId),
    supabase.from("answers").select("question_id,selected_index").eq("event_id", eventId),
  ]);

  if (participantsResult.error) {
    throw new Error(participantsResult.error.message);
  }

  if (questionsResult.error) {
    throw new Error(questionsResult.error.message);
  }

  if (answersResult.error) {
    throw new Error(answersResult.error.message);
  }

  const now = new Date().toISOString();
  const answers = answersResult.data ?? [];
  const { error: eventStatsError } = await supabase.from("event_stats").upsert({
    event_id: eventId,
    participant_count: participantsResult.data?.length ?? 0,
    total_answer_count: answers.length,
    updated_at: now,
  });

  if (eventStatsError) {
    throw new Error(eventStatsError.message);
  }

  await Promise.all(
    (questionsResult.data ?? []).map(async (question) => {
      const counts: [number, number, number, number] = [0, 0, 0, 0];
      for (const answer of answers) {
        if (answer.question_id === question.id && answer.selected_index >= 0 && answer.selected_index <= 3) {
          counts[answer.selected_index] += 1;
        }
      }

      const { error } = await supabase.from("question_stats").upsert({
        question_id: question.id,
        event_id: eventId,
        option_0_count: counts[0],
        option_1_count: counts[1],
        option_2_count: counts[2],
        option_3_count: counts[3],
        total_count: counts.reduce((total, count) => total + count, 0),
        updated_at: now,
      });

      if (error) {
        throw new Error(error.message);
      }
    }),
  );
}
