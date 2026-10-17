import { getMealImage } from '../utils/mealAnalysis';
import { UserFacingError } from '../utils/userFacingError';
import { withRequestDeadline } from './requestDeadline';

export async function prepareProgressPhoto(imageUrl: string, signal: AbortSignal) {
  const source = getMealImage(imageUrl);
  const image = await withRequestDeadline(requestSignal => new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    const cleanup = () => { element.onload = null; element.onerror = null; requestSignal.removeEventListener('abort', cancel); };
    const cancel = () => { cleanup(); element.src = ''; reject(requestSignal.reason); };
    element.onload = () => { cleanup(); resolve(element); };
    element.onerror = () => { cleanup(); reject(new UserFacingError('This photo could not be opened. Try a JPEG or PNG photo.')); };
    requestSignal.addEventListener('abort', cancel, { once: true });
    element.src = `data:${source.mimeType};base64,${source.data}`;
  }), 15000, signal);
  signal.throwIfAborted();
  const ratio = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const context = canvas.getContext('2d');
  if (!context) throw new UserFacingError('This photo could not be prepared. Please try another photo.');
  context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
  // Re-encoding keeps the full frame and strips the original file metadata.
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', .86);
}
