import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type UploadKind = "question" | "option" | "avatar";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const maxBytesByKind: Record<UploadKind, number> = {
  question: 5 * 1024 * 1024,
  option: 3 * 1024 * 1024,
  avatar: 2 * 1024 * 1024,
};

const extensionByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export interface UploadedMedia {
  publicUrl: string;
  storagePath: string;
}

export function validateImageFile(file: File, kind: UploadKind): void {
  if (!allowedTypes.has(file.type)) {
    throw new Error("アップロードできる画像は JPEG / PNG / WebP のみです。");
  }

  if (file.size > maxBytesByKind[kind]) {
    const limitMb = Math.round(maxBytesByKind[kind] / 1024 / 1024);
    throw new Error(`画像サイズは${limitMb}MB以下にしてください。`);
  }
}

export async function uploadPublicImage({
  supabase,
  bucket,
  ownerId,
  kind,
  file,
}: {
  supabase: SupabaseClient<Database>;
  bucket: "quiz-images" | "participant-avatars";
  ownerId: string;
  kind: UploadKind;
  file: File;
}): Promise<UploadedMedia> {
  validateImageFile(file, kind);

  const ext = extensionByType[file.type] ?? "bin";
  const storagePath = `${ownerId}/${kind}/${Date.now()}-${randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(storagePath, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return {
    publicUrl: data.publicUrl,
    storagePath,
  };
}
