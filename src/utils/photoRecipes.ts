import type { LoggedItem } from '../types';

export function collectPhotoRecipes(items: LoggedItem[]): LoggedItem[] {
  const recipes = new Map<string, LoggedItem>();
  for (const item of [...items].sort((a, b) => b.createdAt - a.createdAt)) {
    if (item.source !== 'ai_camera' || !item.imageUrl || recipes.has(item.foodId)) continue;
    recipes.set(item.foodId, item);
  }
  return [...recipes.values()];
}
