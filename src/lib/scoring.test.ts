import { describe, expect, it } from "vitest";
import {
  defaultBasePointsForDifficulty,
  validateBasePoints,
} from "@/lib/question-settings";
import { calculatePoint, speedBonus } from "@/lib/scoring";

describe("scoring", () => {
  it("回答速度ボーナスの境界値を計算する", () => {
    expect(speedBonus(0)).toBe(50);
    expect(speedBonus(2000)).toBe(50);
    expect(speedBonus(2001)).toBe(40);
    expect(speedBonus(4000)).toBe(40);
    expect(speedBonus(4001)).toBe(30);
    expect(speedBonus(6001)).toBe(20);
    expect(speedBonus(8001)).toBe(10);
  });

  it("正解だけ基本点と速度ボーナスを加算する", () => {
    expect(calculatePoint(true, 1500, 100, true)).toEqual({
      basePoints: 100,
      speedBonus: 50,
      point: 150,
    });
    expect(calculatePoint(true, 8500, 300, false)).toEqual({
      basePoints: 300,
      speedBonus: 0,
      point: 300,
    });
    expect(calculatePoint(false, 1500, 1000, true)).toEqual({
      basePoints: 0,
      speedBonus: 0,
      point: 0,
    });
  });

  it("難易度ごとの初期得点を返す", () => {
    expect(defaultBasePointsForDifficulty("easy")).toBe(50);
    expect(defaultBasePointsForDifficulty("normal")).toBe(100);
    expect(defaultBasePointsForDifficulty("hard")).toBe(150);
    expect(defaultBasePointsForDifficulty("special")).toBe(200);
    expect(defaultBasePointsForDifficulty("final")).toBe(300);
  });

  it("基本得点の手動変更範囲を検証する", () => {
    expect(() => validateBasePoints(10)).not.toThrow();
    expect(() => validateBasePoints(1000)).not.toThrow();
    expect(() => validateBasePoints(9)).toThrow("基本得点は10〜1000点");
    expect(() => validateBasePoints(1001)).toThrow("基本得点は10〜1000点");
  });
});
