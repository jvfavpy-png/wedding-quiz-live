import { okJson, errorJson } from "@/lib/api-response";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ roomCode: string }> },
): Promise<Response> {
  try {
    const { roomCode } = await context.params;
    const url = new URL(request.url);
    const name = url.searchParams.get("name")?.trim();

    if (!name) {
      return okJson({ duplicateCount: 0 });
    }

    const supabase = getSupabaseServiceClient();
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("room_code", roomCode.toUpperCase())
      .single();

    if (eventError || !event) {
      throw new Error("イベントが見つかりません。");
    }

    const { count, error } = await supabase
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .eq("name", name.slice(0, 20));

    if (error) {
      throw new Error(error.message);
    }

    return okJson({ duplicateCount: count ?? 0 });
  } catch (error) {
    return errorJson(error);
  }
}
