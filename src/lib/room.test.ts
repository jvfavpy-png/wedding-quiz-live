import { describe, expect, it } from "vitest";
import { buildRoomUrls, generateRoomCode } from "@/lib/room";
import { normalizeRoomCode } from "@/lib/utils";

describe("room", () => {
  it("読み間違えやすい文字を避けたroomCodeを生成する", () => {
    for (let index = 0; index < 100; index += 1) {
      const roomCode = generateRoomCode();
      expect(roomCode).toMatch(/^[A-Z2-9]{6}$/);
      expect(roomCode).not.toMatch(/[IO01]/);
    }
  });

  it("roomCodeを正規化する", () => {
    expect(normalizeRoomCode(" ab12 ")).toBe("AB12");
  });

  it("URLを安全に組み立てる", () => {
    expect(buildRoomUrls("https://example.com/", "ROOM", "secret key")).toEqual({
      adminUrl: "https://example.com/admin/ROOM?key=secret%20key",
      joinUrl: "https://example.com/join/ROOM",
      screenUrl: "https://example.com/screen/ROOM",
    });
  });
});
