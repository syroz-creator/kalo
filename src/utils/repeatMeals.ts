import type { LoggedItem } from '../types';

export function repeatMealChoices(history: LoggedItem[], mode: 'recent' | 'frequent', query = '') {
  const groups = new Map<string, { item: LoggedItem; count: number }>();
  for (const item of [...history].sort((a, b) => b.createdAt - a.createdAt)) {
    const key = JSON.stringify([item.name.trim().toLocaleLowerCase(), item.brand ?? '', item.quantity, item.unit, item.calories, item.protein, item.carbs, item.fat]);
    const entry = groups.get(key);
    if (entry) entry.count++;
    else groups.set(key, { item, count: 1 });
  }
  return [...groups.values()].filter(({ item }) => `${item.name} ${item.brand ?? ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => (mode === 'frequent' ? b.count - a.count : 0) || b.item.createdAt - a.item.createdAt).slice(0, 30);
}
