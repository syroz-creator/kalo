import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OpeningSplash, openingDurationMs } from '../src/components/OpeningSplash';

test('the opening uses a multi-stage brand mark, one accessible status and a skip action', () => {
  const markup = renderToStaticMarkup(createElement(OpeningSplash, { onComplete: () => {} }));
  assert.match(markup, /role="status" aria-label="Opening Kalo"/);
  assert.match(markup, /opening-splash__plate/);
  assert.match(markup, /opening-splash__apple/);
  assert.match(markup, /opening-splash__fork/);
  assert.match(markup, /opening-splash__spoon/);
  assert.equal((markup.match(/class="opening-splash__letter /g) ?? []).length, 3);
  assert.match(markup, /class="opening-splash__o" x="246.54" y="205">o<\/text>/);
  assert.match(markup, /aria-label="Skip intro"/);
  assert.match(markup, /aria-hidden="true" focusable="false"/);
  assert.match(markup, /opening-splash__wordmark" aria-hidden="true">Kalo/);
});

test('the longer sequence supplies its duration to CSS and stays under four seconds', () => {
  assert.ok(openingDurationMs >= 3000 && openingDurationMs < 4000);
  const markup = renderToStaticMarkup(createElement(OpeningSplash, { onComplete: () => {} }));
  assert.ok(markup.includes(`--opening-duration:${openingDurationMs}ms`));
});
