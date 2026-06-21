import { okJson, errorJson } from "@/lib/api-response";
import { normalizeDesignTheme } from "@/lib/design-themes";
import { normalizeRunMode } from "@/lib/run-mode";
import { normalizeSoundSettings, soundAssetFromRow } from "@/lib/sound-settings";
import { getSupabaseAnonServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
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

    const snapshot = data as unknown as RoomSnapshot;
    const service = getSupabaseServiceClient();
    const [{ data: eventRow }, { data: questionRow }, { data: soundAssetRows, error: soundAssetError }] = await Promise.all([
      service
        .from("events")
        .select("design_theme,run_mode,sound_enabled,visual_effects_enabled,sound_pack,effect_style,screen_volume,reveal_delay_seconds,screen_confetti_enabled,guest_sound_enabled,guest_effects_enabled")
        .eq("room_code", roomCode.toUpperCase())
        .maybeSingle(),
      snapshot.liveState.currentQuestionId
        ? service
            .from("questions")
            .select("image_url,option_1_image_url,option_2_image_url,option_3_image_url,option_4_image_url")
            .eq("id", snapshot.liveState.currentQuestionId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      service
        .from("event_sound_assets")
        .select("sound_key,file_url,file_name,mime_type,size_bytes,updated_at")
        .eq("event_id", snapshot.event.id),
    ]);

    if (soundAssetError) {
      throw new Error(soundAssetError.message);
    }

    return okJson({
      ...snapshot,
      event: {
        id: snapshot.event.id,
        title: snapshot.event.title,
        roomCode: snapshot.event.roomCode,
        status: snapshot.event.status,
        designTheme: normalizeDesignTheme(eventRow?.design_theme ?? snapshot.event.designTheme),
        runMode: normalizeRunMode(eventRow?.run_mode ?? snapshot.event.runMode),
        sound: normalizeSoundSettings(eventRow ?? snapshot.event.sound),
      },
      currentQuestion: snapshot.currentQuestion
        ? {
            ...snapshot.currentQuestion,
            imageUrl: questionRow?.image_url ?? null,
            optionImageUrls: [
              questionRow?.option_1_image_url ?? null,
              questionRow?.option_2_image_url ?? null,
              questionRow?.option_3_image_url ?? null,
              questionRow?.option_4_image_url ?? null,
            ],
          }
        : null,
      soundAssets: (soundAssetRows ?? []).map(soundAssetFromRow),
    });
  } catch (error) {
    return errorJson(error);
  }
}
