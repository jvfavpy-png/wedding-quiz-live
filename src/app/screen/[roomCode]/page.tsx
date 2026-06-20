import { ScreenClient } from "@/components/screen/screen-client";

export default async function ScreenPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;
  return <ScreenClient roomCode={roomCode} />;
}
