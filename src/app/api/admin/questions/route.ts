import { okJson, errorJson, readJsonBody } from "@/lib/api-response";
import { getSupabaseAnonServerClient } from "@/lib/supabase/server";
import type { AdminQuestion } from "@/types/quiz";

interface QuestionPayload {
  id?: string | null;
  orderNo?: number;
  text: string;
  options: [string, string, string, string];
  correctIndex: number;
  timeLimitSec: number;
}

interface UpsertQuestionBody {
  roomCode: string;
  adminKey: string;
  question: QuestionPayload;
}

interface DeleteQuestionBody {
  roomCode: string;
  adminKey: string;
  questionId: string;
}

interface ReorderQuestionBody {
  roomCode: string;
  adminKey: string;
  questionIds: string[];
}

function validateQuestion(question: QuestionPayload): void {
  if (!question.text.trim()) {
    throw new Error("問題文を入力してください");
  }
  if (question.options.length !== 4 || question.options.some((option) => !option.trim())) {
    throw new Error("4つの選択肢をすべて入力してください");
  }
  if (![0, 1, 2, 3].includes(question.correctIndex)) {
    throw new Error("正解選択肢が不正です");
  }
  if (question.timeLimitSec < 5 || question.timeLimitSec > 60) {
    throw new Error("制限時間は5〜60秒で設定してください");
  }
}

export async function POST(request: Request): Promise<Response> {
  return upsertQuestion(request);
}

export async function PUT(request: Request): Promise<Response> {
  return upsertQuestion(request);
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<DeleteQuestionBody>(request);
    const supabase = getSupabaseAnonServerClient();
    const { data, error } = await supabase.rpc("admin_delete_question", {
      p_room_code: body.roomCode,
      p_admin_key: body.adminKey,
      p_question_id: body.questionId,
    });

    if (error) {
      throw new Error(error.message);
    }

    return okJson(data);
  } catch (error) {
    const status = error instanceof Error && error.message.includes("管理キー") ? 403 : 400;
    return errorJson(error, status);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<ReorderQuestionBody>(request);

    if (!Array.isArray(body.questionIds) || body.questionIds.length === 0) {
      throw new Error("並び替える問題がありません");
    }

    const supabase = getSupabaseAnonServerClient();
    const { data, error } = await supabase.rpc("admin_reorder_questions", {
      p_room_code: body.roomCode,
      p_admin_key: body.adminKey,
      p_question_ids: body.questionIds,
    });

    if (error) {
      throw new Error(error.message);
    }

    return okJson(data);
  } catch (error) {
    const status = error instanceof Error && error.message.includes("管理キー") ? 403 : 400;
    return errorJson(error, status);
  }
}

async function upsertQuestion(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<UpsertQuestionBody>(request);
    validateQuestion(body.question);

    const supabase = getSupabaseAnonServerClient();
    const { data, error } = await supabase.rpc("admin_upsert_question", {
      p_room_code: body.roomCode,
      p_admin_key: body.adminKey,
      p_question_id: body.question.id ?? null,
      p_order_no: body.question.orderNo ?? 0,
      p_text: body.question.text,
      p_option_1: body.question.options[0],
      p_option_2: body.question.options[1],
      p_option_3: body.question.options[2],
      p_option_4: body.question.options[3],
      p_correct_index: body.question.correctIndex,
      p_time_limit_sec: body.question.timeLimitSec,
    });

    if (error) {
      throw new Error(error.message);
    }

    return okJson(data as unknown as AdminQuestion);
  } catch (error) {
    const status = error instanceof Error && error.message.includes("管理キー") ? 403 : 400;
    return errorJson(error, status);
  }
}
