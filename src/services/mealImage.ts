import { getMealImage } from '../utils/mealAnalysis';

export async function prepareMealImage(imageUrl: string, signal: AbortSignal) {
  signal.throwIfAborted();
  const image = getMealImage(imageUrl);
  if (image.data.length <= 512_000) return image;

  const photo = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    const cleanup = () => {
      element.onload = null; element.onerror = null;
      signal.removeEventListener('abort', cancel);
    };
    const cancel = () => { cleanup(); element.src = ''; reject(signal.reason); };
    element.onload = () => { cleanup(); resolve(element); };
    element.onerror = () => { cleanup(); reject(new Error('This photo could not be opened. Try a JPEG or PNG photo.')); };
    signal.addEventListener('abort', cancel, { once: true });
    element.src = `data:${image.mimeType};base64,${image.data}`;
  });
  signal.throwIfAborted();
  const scale = Math.min(1, 1600 / Math.max(photo.naturalWidth, photo.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(photo.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(photo.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This photo could not be prepared. Please try another photo.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(photo, 0, 0, canvas.width, canvas.height);
  return getMealImage(canvas.toDataURL('image/jpeg', 0.82));
}
