import { describe, expect, it } from "vitest";
import { validateImageFile } from "@/lib/media-upload";

function imageFile(size: number, type: string): File {
  return new File([new Uint8Array(size)], "image", { type });
}

describe("media upload validation", () => {
  it("allows jpeg, png, and webp images within the configured limits", () => {
    expect(() => validateImageFile(imageFile(5 * 1024 * 1024, "image/jpeg"), "question")).not.toThrow();
    expect(() => validateImageFile(imageFile(3 * 1024 * 1024, "image/png"), "option")).not.toThrow();
    expect(() => validateImageFile(imageFile(2 * 1024 * 1024, "image/webp"), "avatar")).not.toThrow();
  });

  it("rejects unsupported image types", () => {
    expect(() => validateImageFile(imageFile(1024, "image/gif"), "question")).toThrow(
      "アップロードできる画像は JPEG / PNG / WebP のみです。",
    );
  });

  it("rejects images over the per-kind size limit", () => {
    expect(() => validateImageFile(imageFile(5 * 1024 * 1024 + 1, "image/jpeg"), "question")).toThrow(
      "画像サイズは5MB以下にしてください。",
    );
    expect(() => validateImageFile(imageFile(3 * 1024 * 1024 + 1, "image/png"), "option")).toThrow(
      "画像サイズは3MB以下にしてください。",
    );
    expect(() => validateImageFile(imageFile(2 * 1024 * 1024 + 1, "image/webp"), "avatar")).toThrow(
      "画像サイズは2MB以下にしてください。",
    );
  });
});
