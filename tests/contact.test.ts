import assert from 'node:assert/strict';
import test from 'node:test';
import { contactEmailLink } from '../src/services/contact';

test('email drafts preserve multilingual messages and encode URL delimiters', () => {
  const message = '  مشكلة بالتصوير & calories?\nארוחה #1 + 2 eggs  ';
  const link = new URL(contactEmailLink('team@example.com', 'complaint', message, '  person+reply@example.com  '));
  assert.equal(decodeURIComponent(link.pathname), 'team@example.com');
  assert.equal(link.searchParams.get('subject'), 'Kalo complaint');
  assert.equal(link.searchParams.get('body'), `${message.trim()}\n\nReply to: person+reply@example.com`);
  assert.equal(link.hash, '');
});

test('suggestions can be sent without a reply address', () => {
  const link = new URL(contactEmailLink('team@example.com', 'suggestion', '  Add a meal shortcut  ', ''));
  assert.equal(link.searchParams.get('subject'), 'Kalo suggestion');
  assert.equal(link.searchParams.get('body'), 'Add a meal shortcut');
});
