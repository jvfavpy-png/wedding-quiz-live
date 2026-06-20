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

export function calculatePoint(isCorrect: boolean, responseMs: number): number {
  return isCorrect ? 100 + speedBonus(responseMs) : 0;
}
