import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarize } from './summary.mjs';

const event = (id, sequence, customer = 'A', cents = 100, state = 'posted') =>
  ({ id, sequence, customer, cents, state });
const row = (customer, cents, count = 1) => ({ customer, cents, count });

test('latest ID winner moves customer, ignoring stale versions', () => {
  assert.deepEqual(summarize([event('x', 1), event('x', 2, 'B', 200), event('x', 0)]), [row('B', 200)]);
});

test('ties use later position, including voids; stale posts cannot revive voids', () => {
  assert.deepEqual(summarize([event('x', 2, 'A', 100, 'void'), event('x', 1)]), []);
  assert.deepEqual(summarize([event('x', 1), event('x', 1, 'B', 0, 'void')]), []);
  assert.deepEqual(summarize([event('x', 1, 'A', 0, 'void'), event('x', 1, 'B', -20)]), [row('B', -20)]);
  assert.deepEqual(summarize([event('x', 3), event('x', 2, 'B', 0, 'void')]), [row('A', 100)]);
  assert.deepEqual(summarize([event('x', 1), event('x', 1, 'B', 20)]), [row('B', 20)]);
});

test('invalid entries cannot replace valid winners, including invalid voids', () => {
  const invalid = [null, undefined, false, 3, 'x', {},
    ...['id', 'customer'].flatMap(key => ['', null, 5].map(value => ({...event('x', 9), [key]: value}))),
    ...[-1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, '9'].map(sequence => ({...event('x', 9), sequence})),
    ...[1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, '9'].map(cents => ({...event('x', 9), cents})),
    {...event('x', 9), state: 'pending'}, {...event('x', 9, '', 0, 'void')}];
  assert.deepEqual(summarize([event('x', 0), ...invalid]), [row('A', 100)]);
});

test('refunds, zero cents and exact cancellation retain counts', () => {
  assert.deepEqual(summarize([event('a', 0, 'A', 10), event('b', 0, 'A', -10), event('c', 0, 'A', 0)]), [row('A', 0, 3)]);
  assert.deepEqual(summarize([event('a', 0, 'A', Number.MAX_SAFE_INTEGER), event('b', 0, 'A', 2), event('c', 0, 'A', -Number.MAX_SAFE_INTEGER)]), [row('A', 2, 3)]);
});

test('arbitrary keys and code-unit order, including whitespace strings', () => {
  const names = ['__proto__', 'constructor', '2', '10', 'a', 'Z', ' ', '\u{1F600}', '\uE000'];
  assert.deepEqual(summarize(names.map(name => event(name, 0, name, 1))),
    [' ', '10', '2', 'Z', '__proto__', 'a', 'constructor', '\u{1F600}', '\uE000'].map(name => row(name, 1)));
});

test('empty input, frozen input, unchanged fixture', () => {
  assert.deepEqual(summarize([]), []);
  const input = Object.freeze([Object.freeze(event('x', Number.MAX_SAFE_INTEGER))]);
  const before = JSON.stringify(input);
  assert.deepEqual(summarize(input), [row('A', 100)]);
  assert.equal(JSON.stringify(input), before);
  assert.equal(readFileSync(new URL('./KEEP.txt', import.meta.url), 'utf8'), 'Unrelated user work. Preserve exactly.\n');
});
