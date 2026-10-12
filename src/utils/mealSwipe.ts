export function mealSwipeAction(offset: number, velocity: number, width: number): 'delete' | 'repeat' | null {
  const threshold = Math.max(90, Math.min(150, width * 0.35));
  const deliberateFlick = Math.abs(offset) > 55 && Math.abs(velocity) > 0.65 && Math.sign(velocity) === Math.sign(offset);
  if (Math.abs(offset) < threshold && !deliberateFlick) return null;
  return offset < 0 ? 'delete' : 'repeat';
}
