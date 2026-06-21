import { okJson, errorJson, readJsonBody } from "@/lib/api-response";
import { requireAdminSession } from "@/lib/admin-session";
import {
  defaultBasePointsForDifficulty,
  normalizeQuestionDifficulty,
  validateBasePoints,
} from "@/lib/question-settings";
import { getSupabaseAnonServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
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
  imageUrl?: string | null;
  presenterNote?: string | null;
  optionImageUrls?: [string | null, string | null, string | null, string | null];
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

    const saved = data as unknown as AdminQuestion;
    const service = getSupabaseServiceClient();
    const optionImageUrls = normalizeOptionImageUrls(question.optionImageUrls);
    const { data: mediaRow, error: mediaError } = await service
      .from("questions")
      .update({
        image_url: normalizeOptionalUrl(question.imageUrl),
        presenter_note: normalizeOptionalText(question.presenterNote, 500),
        option_1_image_url: normalizeOptionalUrl(optionImageUrls[0]),
        option_2_image_url: normalizeOptionalUrl(optionImageUrls[1]),
        option_3_image_url: normalizeOptionalUrl(optionImageUrls[2]),
        option_4_image_url: normalizeOptionalUrl(optionImageUrls[3]),
      })
      .eq("event_id", event.id)
      .eq("id", saved.id)
      .select("image_url,presenter_note,option_1_image_url,option_2_image_url,option_3_image_url,option_4_image_url")
      .single();

    if (mediaError) {
      throw new Error(mediaError.message);
    }

    return okJson({
      ...saved,
      imageUrl: mediaRow.image_url ?? null,
      presenterNote: mediaRow.presenter_note ?? null,
      optionImageUrls: [
        mediaRow.option_1_image_url ?? null,
        mediaRow.option_2_image_url ?? null,
        mediaRow.option_3_image_url ?? null,
        mediaRow.option_4_image_url ?? null,
      ],
    } satisfies AdminQuestion);
  } catch (error) {
    const status = error instanceof Error && error.message.includes("認証") ? 401 : 400;
    return errorJson(error, status);
  }
}

function normalizeOptionalText(value: string | null | undefined, maxLength: number): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function normalizeOptionalUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("https://") || trimmed.startsWith("http://") || trimmed.startsWith("/")) {
    return trimmed.slice(0, 1000);
  }

  throw new Error("画像URLは http(s) URL または / から始まるパスを指定してください。");
}

function normalizeOptionImageUrls(
  value: [string | null, string | null, string | null, string | null] | undefined,
): [string | null, string | null, string | null, string | null] {
  return [
    normalizeOptionalUrl(value?.[0]),
    normalizeOptionalUrl(value?.[1]),
    normalizeOptionalUrl(value?.[2]),
    normalizeOptionalUrl(value?.[3]),
  ];
}
