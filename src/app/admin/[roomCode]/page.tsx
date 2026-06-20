import { AdminRoomClient } from "@/components/admin/admin-room-client";

export default async function AdminRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomCode: string }>;
  searchParams: Promise<{ key?: string | string[] }>;
}) {
  const { roomCode } = await params;
  const query = await searchParams;
  const key = Array.isArray(query.key) ? query.key[0] : query.key;

  return <AdminRoomClient roomCode={roomCode} adminKey={key ?? ""} />;
}
