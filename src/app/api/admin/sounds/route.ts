import { okJson, errorJson, readJsonBody } from "@/lib/api-response";
import { requireAdminSession } from "@/lib/admin-session";
import { isSoundKey } from "@/lib/sound-presets";
import { sanitizeSoundFileName, uploadPublicSound } from "@/lib/sound-upload";
import { soundAssetFromRow } from "@/lib/sound-settings";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

interface DeleteSoundBody {
  roomCode?: string;
  soundKey?: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const form = await request.formData();
    const roomCode = String(form.get("roomCode") ?? "");
    const soundKey = String(form.get("soundKey") ?? "");
    const file = form.get("file");

    if (!isSoundKey(soundKey)) {
      throw new Error("効果音スロットが不正です。");
    }

    if (!(file instanceof File)) {
      throw new Error("効果音ファイルを選択してください。");
    }

    const event = await requireAdminSession(request, roomCode);
    const supabase = getSupabaseServiceClient();
    const { data: currentAsset, error: currentError } = await supabase
      .from("event_sound_assets")
      .select("file_path")
      .eq("event_id", event.id)
      .eq("sound_key", soundKey)
      .maybeSingle();

    if (currentError) {
      throw new Error(currentError.message);
    }

    const uploaded = await uploadPublicSound({
      supabase,
      eventId: event.id,
      soundKey,
      file,
    });

    const { data, error } = await supabase
      .from("event_sound_assets")
      .upsert(
        {
          event_id: event.id,
          sound_key: soundKey,
          file_url: uploaded.publicUrl,
          file_path: uploaded.storagePath,
          file_name: sanitizeSoundFileName(file.name),
          mime_type: file.type,
          size_bytes: file.size,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id,sound_key" },
      )
      .select("sound_key,file_url,file_name,mime_type,size_bytes,updated_at")
      .single();

    if (error) {
      await supabase.storage.from("quiz-sounds").remove([uploaded.storagePath]);
      throw new Error(error.message);
    }

    if (currentAsset?.file_path && currentAsset.file_path !== uploaded.storagePath) {
      await supabase.storage.from("quiz-sounds").remove([currentAsset.file_path]);
    }

    return okJson({ asset: soundAssetFromRow(data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message.includes("認証") ? 401 : 400;
    return errorJson(error, status);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<DeleteSoundBody>(request);
    const roomCode = body.roomCode ?? "";
    const soundKey = body.soundKey ?? "";

    if (!isSoundKey(soundKey)) {
      throw new Error("効果音スロットが不正です。");
    }

    const event = await requireAdminSession(request, roomCode);
    const supabase = getSupabaseServiceClient();
    const { data: currentAsset, error: currentError } = await supabase
      .from("event_sound_assets")
      .select("file_path")
      .eq("event_id", event.id)
      .eq("sound_key", soundKey)
      .maybeSingle();

    if (currentError) {
      throw new Error(currentError.message);
    }

    if (currentAsset?.file_path) {
      await supabase.storage.from("quiz-sounds").remove([currentAsset.file_path]);
    }

    const { error } = await supabase
      .from("event_sound_assets")
      .delete()
      .eq("event_id", event.id)
      .eq("sound_key", soundKey);

    if (error) {
      throw new Error(error.message);
    }

    return okJson({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message.includes("認証") ? 401 : 400;
    return errorJson(error, status);
  }
}
