import { okJson, errorJson, readJsonBody } from "@/lib/api-response";
import { buildRoomUrls, generateAdminKey, generateRoomCode, getAppBaseUrl } from "@/lib/room";
import { sampleQuestions } from "@/lib/sample-data";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { CreatedEvent } from "@/types/quiz";

interface CreateEventBody {
  title?: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody<CreateEventBody>(request);
    const title = body.title?.trim();

    if (!title) {
      throw new Error("イベントタイトルを入力してください");
    }

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

      const urls = buildRoomUrls(getAppBaseUrl(request), data.room_code, adminKey);
      eventId = data.id;
      created = {
        event: {
          id: data.id,
          title: data.title,
          roomCode: data.room_code,
          status: data.status,
        },
        adminKey,
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
      })),
    );

    if (questionError) {
      throw new Error(questionError.message);
    }

    return okJson(created, { status: 201 });
  } catch (error) {
    return errorJson(error);
  }
}
