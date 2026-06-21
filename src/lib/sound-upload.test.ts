import { describe, expect, it } from "vitest";
import { sanitizeSoundFileName, validateSoundFile } from "@/lib/sound-upload";

function audioFile(size: number, type: string, name = "sound.mp3"): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("sound upload validation", () => {
  it("allows supported audio types up to 2MB", () => {
    expect(() => validateSoundFile(audioFile(2 * 1024 * 1024, "audio/mpeg"))).not.toThrow();
    expect(() => validateSoundFile(audioFile(1024, "audio/wav"))).not.toThrow();
    expect(() => validateSoundFile(audioFile(1024, "audio/ogg"))).not.toThrow();
    expect(() => validateSoundFile(audioFile(1024, "audio/webm"))).not.toThrow();
  });

  it("rejects unsupported audio types and oversized files", () => {
    expect(() => validateSoundFile(audioFile(1024, "audio/aac"))).toThrow(
      "アップロードできる音源は MP3 / WAV / OGG / WebM のみです。",
    );
    expect(() => validateSoundFile(audioFile(2 * 1024 * 1024 + 1, "audio/mpeg"))).toThrow(
      "効果音ファイルは2MB以下にしてください。",
    );
  });

  it("sanitizes path-like file names for display storage only", () => {
    expect(sanitizeSoundFileName("..\\..\\correct.mp3")).toBe("correct.mp3");
    expect(sanitizeSoundFileName("../../winner.ogg")).toBe("winner.ogg");
  });
});
