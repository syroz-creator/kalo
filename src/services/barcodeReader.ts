import { UserFacingError } from '../utils/userFacingError';
import { cameraError } from './native';
import { withRequestDeadline } from './requestDeadline';
import type { Result } from '@zxing/library';

async function reader() {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }, { default: UPCEReader }] = await Promise.all([import('@zxing/browser'), import('@zxing/library'), import('@zxing/library/esm/core/oned/UPCEReader')]);
  return {
    decoder: new BrowserMultiFormatReader(new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.ITF]]]), { delayBetweenScanAttempts: 150 }),
    barcode: (result: Result) => result.getBarcodeFormat() === BarcodeFormat.UPC_E ? UPCEReader.convertUPCEtoUPCA(result.getText()) : result.getText(),
  };
}

export async function startBarcodeCamera(video: HTMLVideoElement, onResult: (barcode: string) => void, signal: AbortSignal) {
  if (!navigator.mediaDevices?.getUserMedia) throw new UserFacingError('Live scanning is not available here. Choose a barcode photo or enter its digits instead.');
  let stream: MediaStream | undefined;
  let controls: { stop: () => void } | undefined;
  const stop = () => { controls?.stop(); stream?.getTracks().forEach(track => track.stop()); signal.removeEventListener('abort', stop); };
  try {
    signal.addEventListener('abort', stop, { once: true });
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
    if (signal.aborted) { stop(); signal.throwIfAborted(); }
    const { decoder, barcode } = await reader();
    signal.throwIfAborted();
    let found = false;
    controls = await decoder.decodeFromStream(stream, video, (result, _error, scanner) => {
      if (!result || found || signal.aborted) return;
      found = true; scanner.stop(); stop(); onResult(barcode(result));
    });
    if (signal.aborted || found) stop();
    return stop;
  } catch (error) { stop(); if (signal.aborted) throw error; throw cameraError(error); }
}

export async function readBarcodePhoto(file: File, signal: AbortSignal) {
  const url = URL.createObjectURL(file);
  try {
    return await withRequestDeadline(async requestSignal => {
      const { decoder, barcode } = await reader();
      requestSignal.throwIfAborted();
      const result = await decoder.decodeFromImageUrl(url);
      requestSignal.throwIfAborted();
      return barcode(result);
    }, 10000, signal);
  } catch (error) {
    if (signal.aborted) throw error;
    throw new UserFacingError('We could not read that barcode. Try a closer, sharper photo or enter the digits instead.');
  } finally { URL.revokeObjectURL(url); }
}
