import { withRequestDeadline } from './requestDeadline';

export async function openCameraStream(signal: AbortSignal) {
  return withRequestDeadline(async requestSignal => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: {
      facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 },
    } });
    // Permission prompts cannot be aborted. Dispose late grants after close/background/timeout.
    if (requestSignal.aborted) { stream.getTracks().forEach(track => track.stop()); requestSignal.throwIfAborted(); }
    return stream;
  }, 12000, signal);
}
