import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BodyProgress } from '../src/components/BodyProgress';
import type { BodyProgressPhoto } from '../src/types';
import { bodyCheckInDays, bodyComparison, nextBodyCheckIn, progressDaysApart, validBodyPhoto, validProgressDate } from '../src/utils/bodyProgress';
import { deleteBodyPhoto, loadBodyPhotos, saveBodyPhoto } from '../src/services/bodyProgress';

const photo = (date: string): BodyProgressPhoto => ({ date, imageUrl: 'data:image/jpeg;base64,aGVsbG8=', createdAt: 100 });

test('progress check-ins are 15 calendar days after the newest photo, including leap days and year boundaries', () => {
  assert.equal(bodyCheckInDays, 15);
  assert.equal(nextBodyCheckIn([]), null);
  assert.equal(nextBodyCheckIn([photo('2026-12-25')]), '2027-01-09');
  assert.equal(nextBodyCheckIn([photo('2028-02-20')]), '2028-03-06');
  assert.equal(nextBodyCheckIn([photo('2026-10-10'), photo('2026-09-01'), photo('2026-10-01')]), '2026-10-25');
  assert.equal(nextBodyCheckIn([photo('bad')]), null);
});

test('date differences count calendar days across DST, months and years', () => {
  assert.equal(progressDaysApart('2026-10-17', '2026-11-01'), 15);
  assert.equal(progressDaysApart('2026-03-20', '2026-04-04'), 15);
  assert.equal(progressDaysApart('2026-12-25', '2027-01-09'), 15);
  assert.equal(progressDaysApart('2028-02-28', '2028-03-01'), 2);
  assert.equal(progressDaysApart('2026-10-17', '2026-10-17'), 0);
});

test('comparison defaults to first and latest, supports older pairs and survives deletion', () => {
  const photos = [photo('2026-10-16'), photo('2026-09-16'), photo('2026-10-01')];
  const original = photos.map(item => item.date);
  assert.deepEqual(bodyComparison([]), { earlier: undefined, later: undefined });
  assert.deepEqual(bodyComparison([photos[0]]), { earlier: photos[0], later: undefined });
  assert.deepEqual(bodyComparison(photos), { earlier: photos[1], later: photos[0] });
  assert.deepEqual(bodyComparison(photos, '2026-09-16', '2026-10-01'), { earlier: photos[1], later: photos[2] });
  assert.deepEqual(bodyComparison(photos, '2026-10-16', '2026-10-01'), { earlier: photos[1], later: photos[2] });
  assert.deepEqual(bodyComparison(photos.slice(1), '2026-10-01', '2026-10-16'), { earlier: photos[1], later: photos[2] });
  assert.deepEqual(photos.map(item => item.date), original);
});

test('photo validation rejects malformed dates, remote URLs, executable content and unbounded metadata', () => {
  for (const date of ['2026-02-29', '2026-04-31', '26-01-01', '2026-13-01', '2026-01-00', 'garbage']) assert.equal(validProgressDate(date), false, date);
  assert.equal(validProgressDate('2028-02-29'), true);
  assert.equal(validBodyPhoto(photo('2026-10-01')), true);
  for (const value of [null, {}, { ...photo('2026-10-01'), createdAt: NaN }, { ...photo('2026-10-01'), createdAt: -1 },
    { ...photo('2026-10-01'), imageUrl: 'https://example.com/photo.jpg' },
    { ...photo('2026-10-01'), imageUrl: 'data:image/svg+xml;base64,aGVsbG8=' },
    { ...photo('2026-10-01'), imageUrl: `data:image/jpeg;base64,${'a'.repeat(8_000_000)}` },
  ]) assert.equal(validBodyPhoto(value), false);
});

test('future or invalid photos are rejected before accessing device storage', async () => {
  for (const item of [photo('9999-01-01'), photo('2026-02-30'), { ...photo('2026-01-01'), imageUrl: 'https://example.com/image.jpg' }]) {
    await assert.rejects(saveBodyPhoto(item), /Choose a valid photo and a date that is not in the future/);
  }
});

test('unavailable photo storage returns friendly errors without a success response', async () => {
  await assert.rejects(loadBodyPhotos(), /They have not been deleted/);
  await assert.rejects(saveBodyPhoto(photo('2020-01-01')), /was not saved/);
  await assert.rejects(deleteBodyPhoto('2020-01-01'), /could not be deleted/);
});

test('the simple progress section has an add-photo action and an accessible initial loading state', () => {
  const markup = renderToStaticMarkup(createElement(BodyProgress));
  assert.match(markup, /Body progress/);
  assert.match(markup, /Every 15 days/);
  assert.match(markup, /Add photo/);
  assert.match(markup, /role="status"/);
  assert.doesNotMatch(markup, /body fat|AI score|ideal body/i);
});
