export function crossesDailyTarget(previous: { date: string; target: number; total: number }, current: { date: string; target: number; total: number }, celebrated: boolean) {
  return !celebrated && current.target > 0 && Number.isFinite(current.target) && Number.isFinite(current.total) && previous.date === current.date && previous.target === current.target && previous.total < current.target && current.total >= current.target;
}
