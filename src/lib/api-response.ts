import { formatError } from "@/lib/utils";

export function okJson<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export function errorJson(error: unknown, status = 400): Response {
  return Response.json({ error: formatError(error) }, { status });
}

export async function readJsonBody<T extends object>(request: Request): Promise<T> {
  const body = (await request.json()) as unknown;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("リクエスト形式が不正です");
  }

  return body as T;
}
