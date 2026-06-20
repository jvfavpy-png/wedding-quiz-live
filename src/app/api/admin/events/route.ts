import { okJson, errorJson, readJsonBody } from "@/lib/api-response";
import { validateAdminPasswordConfirmation } from "@/lib/admin-password";
import { buildAdminSessionCookie, getInternalAdminEvent, requireAdminSession } from "@/lib/admin-session";
import { buildRoomUrls, generateAdminKey, generateRoomCode, getAppBaseUrl } from "@/lib/room";
import { sampleQuestions } from "@/lib/sample-data";
import { getSupabaseAnonServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import type { CreatedEvent } from "@/types/quiz";

interface CreateEventBody {
  title?: string;
  adminPassword?: string;
  adminPasswordConfirm?: string;
}

interface UpdateEventBody {
  roomCode: string;
  title: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<CreateEventBody>(request);
    const title = body.title?.trim();

    if (!title) {
      throw new Error("イベントタイトルを入力してください");
    }

    validateAdminPasswordConfirmation(body.adminPassword ?? "", body.adminPasswordConfirm ?? "");

    const supabase = getSupabaseServiceClient();
    const adminKey = generateAdminKey();
    let created: CreatedEvent | null = null;
    let eventId: string | null = null;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const roomCode = generateRoomCode();
      const { data, error } = await supabase
        .from("events")
        .insert({
          title: title.slice(0, 80),
          room_code: roomCode,
          admin_key: adminKey,
        })
        .select("id,title,room_code,status")
        .single();

      if (error) {
        if (error.code === "23505") {
          continue;
        }
        throw new Error(error.message);
      }

      const urls = buildRoomUrls(getAppBaseUrl(request), data.room_code);
      eventId = data.id;
      created = {
        event: {
          id: data.id,
          title: data.title,
          roomCode: data.room_code,
          status: data.status,
        },
        ...urls,
      };
      break;
    }

    if (!created || !eventId) {
      throw new Error("roomCodeの生成に失敗しました。もう一度お試しください");
    }

    const { error: questionError } = await supabase.from("questions").insert(
      sampleQuestions.map((question) => ({
        event_id: eventId,
        order_no: question.orderNo,
        text: question.text,
        option_1: question.options[0],
        option_2: question.options[1],
        option_3: question.options[2],
        option_4: question.options[3],
        correct_index: question.correctIndex,
        time_limit_sec: question.timeLimitSec,
        difficulty: question.difficulty,
        base_points: question.basePoints,
        speed_bonus_enabled: question.speedBonusEnabled,
      })),
    );

    if (questionError) {
      throw new Error(questionError.message);
    }

    const { error: passwordError } = await supabase.rpc("admin_set_password", {
      p_room_code: created.event.roomCode,
      p_admin_key: adminKey,
      p_password: body.adminPassword ?? "",
    });

    if (passwordError) {
      throw new Error(passwordError.message);
    }

    const event = await getInternalAdminEvent(created.event.roomCode);
    return okJson(created, {
      status: 201,
      headers: {
        "Set-Cookie": buildAdminSessionCookie(event),
      },
    });
  } catch (error) {
    return errorJson(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<UpdateEventBody>(request);
    const title = body.title?.trim();

    if (!title) {
      throw new Error("イベント名を入力してください");
    }

    if (title.length > 80) {
      throw new Error("イベント名は80文字以内で入力してください");
    }

    const event = await requireAdminSession(request, body.roomCode);
    const supabase = getSupabaseAnonServerClient();
    const { data, error } = await supabase.rpc("admin_update_event", {
      p_room_code: body.roomCode,
      p_admin_key: event.admin_key,
      p_title: title,
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
