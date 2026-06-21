import { okJson, errorJson } from "@/lib/api-response";
import { uploadPublicImage } from "@/lib/media-upload";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request): Promise<Response> {
  try {
    const form = await request.formData();
    const roomCode = String(form.get("roomCode") ?? "").toUpperCase();
    const participantId = String(form.get("participantId") ?? "");
    const participantToken = String(form.get("participantToken") ?? "");
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new Error("プロフィール画像を選択してください。");
    }

    const supabase = getSupabaseServiceClient();
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("room_code", roomCode)
      .single();

    if (eventError || !event) {
      throw new Error("イベントが見つかりません。");
    }

    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id,participant_token")
      .eq("event_id", event.id)
      .eq("id", participantId)
      .single();

    if (participantError || !participant || participant.participant_token !== participantToken) {
      throw new Error("参加者情報を確認できませんでした。");
    }

    const uploaded = await uploadPublicImage({
      supabase,
      bucket: "participant-avatars",
      ownerId: event.id,
      kind: "avatar",
      file,
    });

    const { error: updateError } = await supabase
      .from("participants")
      .update({ avatar_url: uploaded.publicUrl, last_seen_at: new Date().toISOString() })
      .eq("event_id", event.id)
      .eq("id", participant.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return okJson(uploaded);
  } catch (error) {
    return errorJson(error);
  }
}
