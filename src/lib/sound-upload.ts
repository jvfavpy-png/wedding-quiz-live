import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { SoundKey } from "@/types/quiz";

const allowedAudioTypes = new Set(["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"]);
const maxSoundBytes = 2 * 1024 * 1024;

const extensionByType: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
};

export interface UploadedSound {
  publicUrl: string;
  storagePath: string;
}

export function validateSoundFile(file: File): void {
  if (!allowedAudioTypes.has(file.type)) {
    throw new Error("アップロードできる音源は MP3 / WAV / OGG / WebM のみです。");
  }

  if (file.size > maxSoundBytes) {
    throw new Error("効果音ファイルは2MB以下にしてください。");
  }
}

export async function uploadPublicSound({
  supabase,
  eventId,
  soundKey,
  file,
}: {
  supabase: SupabaseClient<Database>;
  eventId: string;
  soundKey: SoundKey;
  file: File;
}): Promise<UploadedSound> {
  validateSoundFile(file);

  const ext = extensionByType[file.type] ?? "bin";
  const storagePath = `${eventId}/sounds/${soundKey}/${Date.now()}-${randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("quiz-sounds").upload(storagePath, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from("quiz-sounds").getPublicUrl(storagePath);
  return {
    publicUrl: data.publicUrl,
    storagePath,
  };
}

export function sanitizeSoundFileName(name: string): string {
  const baseName = name.split(/[\\/]/).pop()?.trim() || "sound";
  return baseName.slice(0, 120);
}
