import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { parse } from 'postcss';
import { OpeningSplash, openingDurationMs } from '../src/components/OpeningSplash';
import { OpeningArtwork } from '../src/artwork/OpeningArtwork';

test('the opening uses a multi-stage brand mark, one accessible status and a skip action', () => {
  const markup = renderToStaticMarkup(createElement(OpeningArtwork, { onComplete: () => {} }));
  assert.match(markup, /role="status" aria-label="Opening Kalo"/);
  assert.match(markup, /opening-splash__plate/);
  assert.match(markup, /class="opening-splash__weight"[^>]*stroke-width="22"/);
  assert.doesNotMatch(markup, /pathLength=/);
  assert.match(markup, /opening-splash__apple/);
  assert.match(markup, /opening-splash__fork/);
  assert.match(markup, /opening-splash__spoon/);
  assert.equal((markup.match(/class="opening-splash__letter /g) ?? []).length, 3);
  assert.doesNotMatch(markup, /opening-splash__o["\s]/);
  assert.match(markup, /aria-label="Skip intro"/);
  assert.match(markup, /aria-hidden="true" focusable="false"/);
  assert.match(markup, /opening-splash__wordmark" aria-hidden="true">Kalo/);
});

test('the live opening renders scalable vectors and retains its status, skip and static wordmark', () => {
  const markup = renderToStaticMarkup(createElement(OpeningSplash, { onComplete: () => {} }));
  assert.match(markup, /<svg class="opening-splash__scene" viewBox="0 0 400 320"/);
  assert.match(markup, /data-playing="false"/);
  assert.match(markup, /aria-label="Skip intro"/);
  assert.match(markup, /role="status"/);
  assert.doesNotMatch(markup, /<img|<picture|\.gif/);
});

test('the opening avoids animated stroke thickness and fill colors during its plate morph', () => {
  const css = parse(readFileSync('src/app.css', 'utf8'));
  let outlines = 0;
  css.walkAtRules('keyframes', rule => {
    if (!rule.params.startsWith('opening-')) return;
    if (rule.params === 'opening-outline') outlines++;
    rule.walkDecls(declaration => {
      assert.ok(['transform', 'opacity', 'stroke-dashoffset'].includes(declaration.prop), `${rule.params}: ${declaration.prop}`);
      if (declaration.prop === 'stroke-dashoffset') assert.equal(rule.params, 'opening-outline');
    });
  });
  assert.equal(outlines, 1);
});

test('the longer sequence supplies its duration to CSS and stays under four seconds', () => {
  assert.ok(openingDurationMs >= 3000 && openingDurationMs < 4000);
  const markup = renderToStaticMarkup(createElement(OpeningSplash, { onComplete: () => {} }));
  assert.ok(markup.includes(`--opening-duration:${openingDurationMs}ms`));
});
