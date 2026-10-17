import type { BodyProgressPhoto } from '../types';
import { addDaysToKey, formatDateKey, parseDateKey } from './date';

export const bodyCheckInDays = 15;

export function validProgressDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && formatDateKey(parseDateKey(date)) === date;
}

export function progressDaysApart(earlier: string, later: string) {
  const utc = (key: string) => {
    const date = parseDateKey(key);
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  };
  return Math.round((utc(later) - utc(earlier)) / 86400000);
}

export function nextBodyCheckIn(photos: Pick<BodyProgressPhoto, 'date'>[]) {
  const latest = photos.map(photo => photo.date).filter(validProgressDate).sort().at(-1);
  return latest ? addDaysToKey(latest, bodyCheckInDays) : null;
}

export function bodyComparison(photos: BodyProgressPhoto[], earlier = '', later = '') {
  const sorted = [...photos].sort((a, b) => a.date.localeCompare(b.date));
  const right = sorted.find(photo => photo.date === later && photo.date > (sorted[0]?.date ?? '')) ?? sorted.at(-1);
  const left = sorted.find(photo => photo.date === earlier && photo.date < (right?.date ?? '')) ?? sorted[0];
  return { earlier: left, later: right && right.date !== left?.date ? right : undefined };
}

export function validBodyPhoto(value: unknown): value is BodyProgressPhoto {
  if (!value || typeof value !== 'object') return false;
  const photo = value as Partial<BodyProgressPhoto>;
  return typeof photo.date === 'string' && validProgressDate(photo.date)
    && typeof photo.createdAt === 'number' && Number.isFinite(photo.createdAt) && photo.createdAt >= 0
    && typeof photo.imageUrl === 'string' && photo.imageUrl.length <= 8_000_000
    && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo.imageUrl);
}
