import { describe, expect, it } from "vitest";
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
    expect(calculatePoint(true, 1500)).toBe(150);
    expect(calculatePoint(true, 8500)).toBe(110);
    expect(calculatePoint(false, 1500)).toBe(0);
  });
});
