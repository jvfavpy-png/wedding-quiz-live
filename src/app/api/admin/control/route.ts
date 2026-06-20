import { okJson, errorJson, readJsonBody } from "@/lib/api-response";
import { getSupabaseAnonServerClient } from "@/lib/supabase/server";
import type { AdminAction } from "@/types/quiz";

interface ControlBody {
  roomCode: string;
  adminKey: string;
  action: AdminAction;
  questionId?: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<ControlBody>(request);
    const supabase = getSupabaseAnonServerClient();

    if (body.action === "start_question") {
      if (!body.questionId) {
        throw new Error("開始する問題を選択してください");
      }

      const { data, error } = await supabase.rpc("admin_start_question", {
        p_room_code: body.roomCode,
        p_admin_key: body.adminKey,
        p_question_id: body.questionId,
      });

      if (error) {
        throw new Error(error.message);
      }

      return okJson(data);
    }

    if (body.action === "close_question") {
      const { data, error } = await supabase.rpc("admin_close_question", {
        p_room_code: body.roomCode,
        p_admin_key: body.adminKey,
      });
      if (error) {
        throw new Error(error.message);
      }
      return okJson(data);
    }

    if (body.action === "reveal_answer") {
      const { data, error } = await supabase.rpc("admin_reveal_answer", {
        p_room_code: body.roomCode,
        p_admin_key: body.adminKey,
      });
      if (error) {
        throw new Error(error.message);
      }
      return okJson(data);
    }

    if (body.action === "show_ranking") {
      const { data, error } = await supabase.rpc("admin_show_ranking", {
        p_room_code: body.roomCode,
        p_admin_key: body.adminKey,
      });
      if (error) {
        throw new Error(error.message);
      }
      return okJson(data);
    }

    if (body.action === "finish_event") {
      const { data, error } = await supabase.rpc("admin_finish_event", {
        p_room_code: body.roomCode,
        p_admin_key: body.adminKey,
      });
      if (error) {
        throw new Error(error.message);
      }
      return okJson(data);
    }

    throw new Error("不明な操作です");
  } catch (error) {
    const status = error instanceof Error && error.message.includes("管理キー") ? 403 : 400;
    return errorJson(error, status);
  }
}
