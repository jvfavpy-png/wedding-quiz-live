export function speedBonus(responseMs: number): number {
  if (responseMs <= 2000) {
    return 50;
  }
  if (responseMs <= 4000) {
    return 40;
  }
  if (responseMs <= 6000) {
    return 30;
  }
  if (responseMs <= 8000) {
    return 20;
  }
  return 10;
}

export interface PointBreakdown {
  basePoints: number;
  speedBonus: number;
  point: number;
}

export function calculatePoint(
  isCorrect: boolean,
  responseMs: number,
  basePoints: number,
  speedBonusEnabled: boolean,
): PointBreakdown {
  if (!isCorrect) {
    return {
      basePoints: 0,
      speedBonus: 0,
      point: 0,
    };
  }

  const awardedSpeedBonus = speedBonusEnabled ? speedBonus(responseMs) : 0;

  return {
    basePoints,
    speedBonus: awardedSpeedBonus,
    point: basePoints + awardedSpeedBonus,
  };
}
