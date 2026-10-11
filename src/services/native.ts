import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { UserFacingError } from '../utils/userFacingError';

export function cameraError(error: unknown) {
  if (error instanceof UserFacingError) return error;
  const message = error instanceof Error ? `${error.name} ${error.message}` : '';
  if (/permission|denied|restricted|NotAllowedError/i.test(message)) return new UserFacingError('Camera access is turned off. Allow Kalo to use your camera in your device settings, then try again.');
  if (/not available|unavailable|not implemented|not supported/i.test(message)) return new UserFacingError('The camera is not available on this device. Choose a photo from your library instead.');
  return new UserFacingError('We could not open the camera. Please try again, or choose a photo from your library.');
}

export const isNativeApp = () => Capacitor.isNativePlatform();

export async function setNativeAppearance(theme: 'dark' | 'light') {
  if (!isNativeApp()) return;
  await SystemBars.setStyle({ style: theme === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light });
}

export async function captureMealPhoto(): Promise<string | null> {
  try {
    const photo = await Camera.getPhoto({
      source: CameraSource.Camera,
      resultType: CameraResultType.DataUrl,
      quality: 85,
      width: 1600,
      height: 1600,
      correctOrientation: true,
      saveToGallery: false,
    });
    if (!photo.dataUrl) throw new UserFacingError('Could not read this photo. Please try again.');
    return photo.dataUrl;
  } catch (error) {
    if (error instanceof Error && /cancel/i.test(error.message)) return null;
    throw cameraError(error);
  }
}
