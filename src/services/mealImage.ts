import { getMealImage } from '../utils/mealAnalysis';
import { UserFacingError } from '../utils/userFacingError';
import { withRequestDeadline } from './requestDeadline';

export async function prepareMealImage(imageUrl: string, signal: AbortSignal, normalize = false) {
  signal.throwIfAborted();
  const image = getMealImage(imageUrl);
  if (!normalize && image.data.length <= 384_000) return image;

  const photo = await withRequestDeadline(requestSignal => new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    const cleanup = () => {
      element.onload = null; element.onerror = null;
      requestSignal.removeEventListener('abort', cancel);
    };
    const cancel = () => { cleanup(); element.src = ''; reject(requestSignal.reason); };
    element.onload = () => { cleanup(); resolve(element); };
    element.onerror = () => { cleanup(); reject(new UserFacingError('This photo could not be opened. Try a JPEG or PNG photo.')); };
    requestSignal.addEventListener('abort', cancel, { once: true });
    element.src = `data:${image.mimeType};base64,${image.data}`;
  }), 15000, signal);
  signal.throwIfAborted();
  const scale = Math.min(1, 1280 / Math.max(photo.naturalWidth, photo.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(photo.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(photo.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new UserFacingError('This photo could not be prepared. Please try another photo.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(photo, 0, 0, canvas.width, canvas.height);
  try { return getMealImage(canvas.toDataURL('image/jpeg', 0.76)); }
  finally { canvas.width = 0; canvas.height = 0; photo.src = ''; }
}
