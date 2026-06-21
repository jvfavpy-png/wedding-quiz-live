import { okJson, errorJson } from "@/lib/api-response";
import { requireAdminSession } from "@/lib/admin-session";
import { uploadPublicImage, type UploadKind } from "@/lib/media-upload";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request): Promise<Response> {
  try {
    const form = await request.formData();
    const roomCode = String(form.get("roomCode") ?? "");
    const kind = String(form.get("kind") ?? "question") as UploadKind;
    const file = form.get("file");

    if (kind !== "question" && kind !== "option") {
      throw new Error("画像の用途が不正です。");
    }

    if (!(file instanceof File)) {
      throw new Error("画像ファイルを選択してください。");
    }

    const event = await requireAdminSession(request, roomCode);
    const supabase = getSupabaseServiceClient();
    const uploaded = await uploadPublicImage({
      supabase,
      bucket: "quiz-images",
      ownerId: event.id,
      kind,
      file,
    });

    return okJson(uploaded);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message.includes("認証") || message.includes("隱崎ｨｼ") ? 401 : 400;
    return errorJson(error, status);
  }
}
