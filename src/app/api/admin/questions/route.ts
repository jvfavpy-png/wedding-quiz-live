import { okJson, errorJson, readJsonBody } from "@/lib/api-response";
import { requireAdminSession } from "@/lib/admin-session";
import {
  defaultBasePointsForDifficulty,
  normalizeQuestionDifficulty,
  validateBasePoints,
} from "@/lib/question-settings";
import { getSupabaseAnonServerClient } from "@/lib/supabase/server";
import type { AdminQuestion, QuestionDifficulty } from "@/types/quiz";

interface QuestionPayload {
  id?: string | null;
  orderNo?: number;
  text: string;
  options: [string, string, string, string];
  correctIndex: number;
  timeLimitSec: number;
  difficulty?: QuestionDifficulty;
  basePoints?: number;
  speedBonusEnabled?: boolean;
}

interface UpsertQuestionBody {
  roomCode: string;
  question: QuestionPayload;
}

interface DeleteQuestionBody {
  roomCode: string;
  questionId: string;
}

interface ReorderQuestionBody {
  roomCode: string;
  questionIds: string[];
}

type NormalizedQuestionPayload = QuestionPayload & {
  difficulty: QuestionDifficulty;
  basePoints: number;
  speedBonusEnabled: boolean;
};

function normalizeAndValidateQuestion(question: QuestionPayload): NormalizedQuestionPayload {
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

  const difficulty = normalizeQuestionDifficulty(question.difficulty);
  const basePoints = question.basePoints ?? defaultBasePointsForDifficulty(difficulty);
  validateBasePoints(basePoints);

  return {
    ...question,
    difficulty,
    basePoints,
    speedBonusEnabled: question.speedBonusEnabled ?? true,
  };
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
    const event = await requireAdminSession(request, body.roomCode);
    const supabase = getSupabaseAnonServerClient();
    const { data, error } = await supabase.rpc("admin_delete_question", {
      p_room_code: body.roomCode,
      p_admin_key: event.admin_key,
      p_question_id: body.questionId,
    });

    if (error) {
      throw new Error(error.message);
    }

    return okJson(data);
  } catch (error) {
    const status = error instanceof Error && error.message.includes("認証") ? 401 : 400;
    return errorJson(error, status);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<ReorderQuestionBody>(request);
    const event = await requireAdminSession(request, body.roomCode);

    if (!Array.isArray(body.questionIds) || body.questionIds.length === 0) {
      throw new Error("並び替える問題がありません");
    }

    const supabase = getSupabaseAnonServerClient();
    const { data, error } = await supabase.rpc("admin_reorder_questions", {
      p_room_code: body.roomCode,
      p_admin_key: event.admin_key,
      p_question_ids: body.questionIds,
    });

    if (error) {
      throw new Error(error.message);
    }

    return okJson(data);
  } catch (error) {
    const status = error instanceof Error && error.message.includes("認証") ? 401 : 400;
    return errorJson(error, status);
  }
}

async function upsertQuestion(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<UpsertQuestionBody>(request);
    const event = await requireAdminSession(request, body.roomCode);
    const question = normalizeAndValidateQuestion(body.question);

    const supabase = getSupabaseAnonServerClient();
    const { data, error } = await supabase.rpc("admin_upsert_question", {
      p_room_code: body.roomCode,
      p_admin_key: event.admin_key,
      p_question_id: question.id ?? null,
      p_order_no: question.orderNo ?? 0,
      p_text: question.text,
      p_option_1: question.options[0],
      p_option_2: question.options[1],
      p_option_3: question.options[2],
      p_option_4: question.options[3],
      p_correct_index: question.correctIndex,
      p_time_limit_sec: question.timeLimitSec,
      p_difficulty: question.difficulty,
      p_base_points: question.basePoints,
      p_speed_bonus_enabled: question.speedBonusEnabled,
    });

    if (error) {
      throw new Error(error.message);
    }

    return okJson(data as unknown as AdminQuestion);
  } catch (error) {
    const status = error instanceof Error && error.message.includes("認証") ? 401 : 400;
    return errorJson(error, status);
  }
}
