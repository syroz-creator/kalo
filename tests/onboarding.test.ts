import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OnboardingModal } from '../src/components/OnboardingModal';
import { DEFAULT_PROFILE } from '../src/services/storage';

test('setup retains six steps and its original goal choices with accessible progress', () => {
  const markup = renderToStaticMarkup(createElement(OnboardingModal, { isOpen: true, initialProfile: DEFAULT_PROFILE, onComplete: () => {} }));
  assert.match(markup, /role="dialog" aria-modal="true" aria-labelledby="setup-title"/);
  assert.match(markup, /data-step="1"/);
  assert.match(markup, /aria-label="Step 1 of 6"/);
  assert.match(markup, /aria-valuemax="6" aria-valuenow="1"/);
  assert.match(markup, /<span class="is-filled"><\/span>(?:<span class=""><\/span>){5}/);
  assert.equal((markup.match(/name="goal"/g) ?? []).length, 3);
  for (const label of ['Lose weight', 'Maintain weight', 'Build muscle']) assert.ok(markup.includes(label));
  assert.match(markup, /class="setup-wordmark">Kalo/);
  assert.match(markup, /aria-label="Language"/);
  assert.match(markup, /aria-label="Previous step"[^>]*disabled/);
});

test('setup respects the saved goal when it is reopened without completing or changing the profile', () => {
  for (const goal of ['lose', 'maintain', 'gain'] as const) {
    const profile = { ...DEFAULT_PROFILE, goal };
    const original = JSON.stringify(profile);
    let completed = false;
    const markup = renderToStaticMarkup(createElement(OnboardingModal, { isOpen: true, initialProfile: profile, onComplete: () => { completed = true; } }));
    const selected = markup.match(/class="setup-choice is-selected"[\s\S]*?<strong>(.*?)<\/strong>/)?.[1];
    assert.equal(selected, { lose: 'Lose weight', maintain: 'Maintain weight', gain: 'Build muscle' }[goal]);
    assert.equal(completed, false);
    assert.equal(JSON.stringify(profile), original);
  }
});

test('completed setup is absent when closed', () => {
  assert.equal(renderToStaticMarkup(createElement(OnboardingModal, { isOpen: false, initialProfile: DEFAULT_PROFILE, onComplete: () => {} })), '');
});
