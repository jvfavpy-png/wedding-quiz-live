import { JoinRoomClient } from "@/components/join/join-room-client";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;
  return <JoinRoomClient roomCode={roomCode} />;
}
