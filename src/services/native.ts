import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

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
    if (!photo.dataUrl) throw new Error('Could not read this photo. Please try again.');
    return photo.dataUrl;
  } catch (error) {
    if (error instanceof Error && /cancel/i.test(error.message)) return null;
    throw error;
  }
}
