import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarize } from './summary.mjs';

const event = (id, customer, sequence, cents, state = 'posted') =>
  ({ id, customer, sequence, cents, state });

test('latest id wins across customers and unordered sequences', () => {
  assert.deepEqual(summarize([
    event('a', 'Old', 1, 100), event('a', 'New', 2, 250),
    event('a', 'Stale', 0, 900),
  ]), [{ customer: 'New', cents: 250, count: 1 }]);
});

test('later ties win; void tombstones survive stale posts; newer posts restore', () => {
  assert.deepEqual(summarize([
    event('a', 'A', 2, 10), event('a', 'B', 2, 20),
    event('b', 'B', 5, 30, 'void'), event('b', 'B', 4, 40),
    event('c', 'C', 1, 50, 'void'), event('c', 'B', 2, -5),
    event('d', 'D', 1, 7), event('d', 'D', 1, 7, 'void'),
  ]), [{ customer: 'B', cents: 15, count: 2 }]);
});

test('invalid entries cannot replace valid winners, including invalid voids', () => {
  const valid = event('a', 'A', 0, -10);
  const invalid = [null, undefined, false, 42, 'posted', {},
    { ...valid, id: '' }, { ...valid, id: 1 },
    { ...valid, customer: '' }, { ...valid, customer: 1 },
    ...[-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1'].map(sequence => ({ ...valid, sequence })),
    ...[0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1'].map(cents => ({ ...valid, cents })),
    { ...valid, state: 'pending' },
    { ...valid, sequence: 9, customer: '', state: 'void' },
  ];
  assert.deepEqual(summarize([valid, ...invalid]), [{ customer: 'A', cents: -10, count: 1 }]);
});

test('safe string keys, refunds, zero counts, code-unit order, no mutation', () => {
  const names = ['2', '__proto__', 'constructor', '10', 'a', 'Z', '😀', '\uE000', ' '];
  const input = names.map((name, i) => Object.freeze(event(name, name, i, 0)));
  input.push(Object.freeze(event('refund', 'a', Number.MAX_SAFE_INTEGER, -25)));
  const before = JSON.stringify(input);
  Object.freeze(input);
  const expected = [...names].sort().map(customer => ({
    customer, cents: customer === 'a' ? -25 : 0, count: customer === 'a' ? 2 : 1,
  }));
  assert.deepEqual(summarize(input), expected);
  assert.equal(JSON.stringify(input), before);
});

test('empty input, safe integer bounds, KEEP exact bytes', () => {
  assert.deepEqual(summarize([]), []);
  assert.deepEqual(summarize([event('max', 'A', 0, Number.MAX_SAFE_INTEGER)]),
    [{ customer: 'A', cents: Number.MAX_SAFE_INTEGER, count: 1 }]);
  assert.deepEqual(summarize([event('min', 'A', 0, Number.MIN_SAFE_INTEGER)]),
    [{ customer: 'A', cents: Number.MIN_SAFE_INTEGER, count: 1 }]);
  assert.equal(readFileSync(new URL('./KEEP.txt', import.meta.url), 'utf8'),
    'Unrelated user work. Preserve exactly.\n');
});

test('exact final total despite unsafe intermediate sums', () => {
  assert.deepEqual(summarize([
    event('a', 'A', 0, Number.MAX_SAFE_INTEGER),
    event('b', 'A', 0, 2),
    event('c', 'A', 0, -Number.MAX_SAFE_INTEGER),
  ]), [{ customer: 'A', cents: 2, count: 3 }]);
});
