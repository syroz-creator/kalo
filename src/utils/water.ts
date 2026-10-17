export const waterGoalMl = 2500;
export const waterSlots = 8;
export const waterSlotMl = waterGoalMl / waterSlots;
export const maxScanWaterMl = 10000;

export function validWaterMl(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= maxScanWaterMl;
}

export function waterSlotFill(amountMl: number, index: number) {
  return Math.max(0, Math.min(1, amountMl / waterSlotMl - index));
}
