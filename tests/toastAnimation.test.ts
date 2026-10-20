import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'postcss';
import { ToastAnimation } from '../src/components/ToastAnimation';
import { ToastArtwork } from '../src/artwork/ToastArtwork';

test('each toaster clips its moving bread to a unique slot without adding screen-reader announcements', () => {
  const markup = renderToStaticMarkup(createElement(Fragment, null, createElement(ToastArtwork), createElement(ToastArtwork)));
  const slots = [...markup.matchAll(/<clipPath id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(slots.length, 2);
  assert.equal(new Set(slots).size, 2);
  for (const slot of slots) assert.ok(markup.includes(`clip-path="url(#${slot})"`));
  assert.equal((markup.match(/aria-hidden="true" focusable="false"/g) ?? []).length, 2);
});

test('the live toaster renders scalable vectors without a fixed frame rate or raster download', () => {
  const markup = renderToStaticMarkup(createElement(ToastAnimation));
  assert.match(markup, /<svg class="scan-toast" viewBox="0 0 160 160"/);
  assert.doesNotMatch(markup, /<img|<picture|\.gif/);
});

test('the bread dips fully inside, springs above its resting position and settles back without a loop jump', () => {
  const css = parse(readFileSync('src/app.css', 'utf8'));
  const transforms: string[] = [];
  css.walkAtRules('keyframes', rule => {
    if (rule.params === 'toast-dip') rule.walkDecls('transform', declaration => { transforms.push(declaration.value); });
    if (rule.params.startsWith('toast-')) rule.walkDecls(declaration => {
      assert.ok(['transform', 'opacity', 'animation-timing-function'].includes(declaration.prop), `${rule.params}: ${declaration.prop}`);
    });
  });
  assert.ok(transforms.some(value => value.includes('translateY(70px)')));
  assert.ok(transforms.some(value => value.includes('translateY(-15px)')));
  assert.equal(transforms[0], transforms.at(-1));
});

test('bread, browning, lever, heat and steam share the same looping clock', () => {
  const css = parse(readFileSync('src/app.css', 'utf8'));
  let synchronized = 0;
  css.walkRules(rule => {
    if (!/^\.scan-toast__\w+$/.test(rule.selector)) return;
    rule.walkDecls('animation', declaration => {
      assert.ok(declaration.value.includes('var(--toast-cycle)'));
      assert.ok(declaration.value.includes('infinite'));
      synchronized++;
    });
  });
  assert.equal(synchronized, 5);
});
