import assert from 'node:assert/strict';
import test from 'node:test';
import { cameraError } from '../src/services/native';
import { getUserErrorMessage, UserFacingError } from '../src/utils/userFacingError';

test('only application-owned error messages reach the screen', () => {
  const fallback = 'Please try again.';
  assert.equal(getUserErrorMessage(new UserFacingError('Choose a meal photo first.'), fallback), 'Choose a meal photo first.');
  for (const error of [new Error('HTTP 503 secret-value'), new Error('The scan failed: secret-value'), { message: 'secret-value' }, 'secret-value', null]) {
    assert.equal(getUserErrorMessage(error, fallback), fallback);
  }
});

test('camera permissions and availability have clear recovery messages without native details', () => {
  assert.match(cameraError(new Error('Camera permission denied: private-details')).message, /Allow Kalo to use your camera in your device settings/);
  assert.match(cameraError(new Error('Camera not implemented: private-details')).message, /Choose a photo from your library/);
  assert.match(cameraError(new Error('NativeCameraError 123 private-details')).message, /Please try again/);
  assert(!cameraError(new Error('NativeCameraError 123 private-details')).message.includes('123'));
  const unreadable = new UserFacingError('Could not read this photo. Please try again.');
  assert.equal(cameraError(unreadable), unreadable);
});
