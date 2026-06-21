import { okJson, errorJson } from "@/lib/api-response";
import { requireAdminSession } from "@/lib/admin-session";
import { normalizeDesignTheme } from "@/lib/design-themes";
import { normalizeRunMode } from "@/lib/run-mode";
import { normalizeSoundSettings, soundAssetFromRow } from "@/lib/sound-settings";
import { getSupabaseAnonServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import type { AdminParticipant, AdminSnapshot } from "@/types/quiz";

export async function GET(
  request: Request,
  context: { params: Promise<{ roomCode: string }> },
): Promise<Response> {
  try {
    const { roomCode } = await context.params;
    const event = await requireAdminSession(request, roomCode);

    const supabase = getSupabaseAnonServerClient();
    const { data, error } = await supabase.rpc("get_admin_room_snapshot", {
      p_room_code: roomCode,
      p_admin_key: event.admin_key,
    });

    if (error) {
      return errorJson(error.message, 400);
    }

    const snapshot = data as unknown as AdminSnapshot;
    const service = getSupabaseServiceClient();
    const [eventResult, participantResult, answerResult, questionMediaResult, soundAssetResult] = await Promise.all([
      service
        .from("events")
        .select("design_theme,run_mode,sound_enabled,visual_effects_enabled,sound_pack,effect_style,screen_volume,reveal_delay_seconds,screen_confetti_enabled,guest_sound_enabled,guest_effects_enabled")
        .eq("id", event.id)
        .single(),
      service
        .from("participants")
        .select("id,name,score,avatar_url,joined_at,last_seen_at")
        .eq("event_id", event.id)
        .order("score", { ascending: false })
        .order("joined_at", { ascending: true }),
      service.from("answers").select("participant_id").eq("event_id", event.id),
      service
        .from("questions")
        .select("id,image_url,presenter_note,option_1_image_url,option_2_image_url,option_3_image_url,option_4_image_url")
        .eq("event_id", event.id),
      service
        .from("event_sound_assets")
        .select("sound_key,file_url,file_name,mime_type,size_bytes,updated_at")
        .eq("event_id", event.id)
        .order("sound_key", { ascending: true }),
    ]);

    if (eventResult.error) {
      throw new Error(eventResult.error.message);
    }

    if (participantResult.error) {
      throw new Error(participantResult.error.message);
    }

    if (answerResult.error) {
      throw new Error(answerResult.error.message);
    }

    if (questionMediaResult.error) {
      throw new Error(questionMediaResult.error.message);
    }

    if (soundAssetResult.error) {
      throw new Error(soundAssetResult.error.message);
    }

    const answerCounts = new Map<string, number>();
    for (const answer of answerResult.data ?? []) {
      answerCounts.set(answer.participant_id, (answerCounts.get(answer.participant_id) ?? 0) + 1);
    }

    const nameCounts = new Map<string, number>();
    for (const participant of participantResult.data ?? []) {
      nameCounts.set(participant.name, (nameCounts.get(participant.name) ?? 0) + 1);
    }

    const participants: AdminParticipant[] = (participantResult.data ?? []).map((participant) => ({
      participantId: participant.id,
      name: participant.name,
      score: participant.score,
      answerCount: answerCounts.get(participant.id) ?? 0,
      joinedAt: participant.joined_at,
      lastSeenAt: participant.last_seen_at,
      avatarUrl: participant.avatar_url ?? null,
      duplicateNameCount: nameCounts.get(participant.name) ?? 1,
    }));

    const mediaByQuestion = new Map((questionMediaResult.data ?? []).map((question) => [question.id, question]));
    const questions = snapshot.questions.map((question) => {
      const media = mediaByQuestion.get(question.id);
      return {
        ...question,
        imageUrl: media?.image_url ?? null,
        presenterNote: media?.presenter_note ?? null,
        optionImageUrls: [
          media?.option_1_image_url ?? null,
          media?.option_2_image_url ?? null,
          media?.option_3_image_url ?? null,
          media?.option_4_image_url ?? null,
        ],
      };
    });

    return okJson({
      ...snapshot,
      event: {
        ...snapshot.event,
        designTheme: normalizeDesignTheme(eventResult.data?.design_theme ?? snapshot.event.designTheme),
        runMode: normalizeRunMode(eventResult.data?.run_mode ?? snapshot.event.runMode),
        sound: normalizeSoundSettings(eventResult.data ?? snapshot.event.sound),
      },
      questions,
      participants,
      soundAssets: (soundAssetResult.data ?? []).map(soundAssetFromRow),
    });
  } catch (error) {
    const status = error instanceof Error && error.message.includes("認証") ? 401 : 400;
    return errorJson(error, status);
  }
}
