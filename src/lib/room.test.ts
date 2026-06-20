import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPublicRoomUrls, resolveAppBaseUrl } from "@/lib/app-url";
import { buildRoomUrls, generateRoomCode } from "@/lib/room";
import { normalizeRoomCode } from "@/lib/utils";

describe("room", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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
    expect(buildRoomUrls("https://example.com/", "ROOM")).toEqual({
      adminUrl: "https://example.com/admin/ROOM",
      joinUrl: "https://example.com/join/ROOM",
      screenUrl: "https://example.com/screen/ROOM",
    });
  });

  it("URL生成はNEXT_PUBLIC_APP_URLを優先する", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://wedding-quiz-live.vercel.app/");
    expect(resolveAppBaseUrl({ windowOrigin: "http://localhost:3000" })).toBe(
      "https://wedding-quiz-live.vercel.app",
    );
  });

  it("NEXT_PUBLIC_APP_URLがなければwindow.location.origin相当を使う", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(buildPublicRoomUrls("https://example.com/", "ROOM")).toEqual({
      adminUrl: "https://example.com/admin/ROOM",
      joinUrl: "https://example.com/join/ROOM",
      screenUrl: "https://example.com/screen/ROOM",
    });
    expect(resolveAppBaseUrl({ windowOrigin: "http://localhost:3001" })).toBe("http://localhost:3001");
  });
});
