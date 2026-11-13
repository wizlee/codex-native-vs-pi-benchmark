import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { summarize } from './summary.mjs';

const event = (id, sequence, cents, customer = 'A', state = 'posted') =>
  ({ id, sequence, cents, customer, state });

test('latest valid sequence wins, later position breaks ties, customer can change', () => {
  assert.deepEqual(summarize([
    event('x', 3, 30), event('x', 1, 100), event('x', 3, -5, 'B'),
    event('y', 0, 12, 'B'),
  ]), [{ customer: 'B', cents: 7, count: 2 }]);
});

test('void wins without allowing stale resurrection; newer post restores', () => {
  assert.deepEqual(summarize([
    event('x', 5, 1, 'A', 'void'), event('x', 2, 10),
    event('y', 1, 10), event('y', 1, 0, 'A', 'void'),
    event('z', 1, 0, 'A', 'void'), event('z', 2, -9),
  ]), [{ customer: 'A', cents: -9, count: 1 }]);
});

test('invalid entries never replace valid winners, including invalid voids', () => {
  const good = event('x', 1, 7);
  const invalid = [null, undefined, false, 4, 'text', {},
    ...['', 4, null].flatMap(value => [
      { ...good, id: value }, { ...good, customer: value },
    ]),
    ...[-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '2'].map(sequence => ({ ...good, sequence })),
    ...[0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '8', null].map(cents => ({ ...good, sequence: 9, cents, state: 'void' })),
    { ...good, sequence: 9, state: 'pending' },
  ];
  assert.deepEqual(summarize([good, ...invalid]), [{ customer: 'A', cents: 7, count: 1 }]);
});

test('arbitrary keys and code-unit customer ordering', () => {
  const customers = ['__proto__', 'constructor', '10', '2', 'a', 'Z', 'ä', '😀', '\uE000', ' '];
  const expected = [...customers].sort().map(customer => ({ customer, cents: 0, count: 1 }));
  assert.deepEqual(summarize(customers.map(customer => event(customer, 0, 0, customer))), expected);
});

test('safe final totals remain exact through large cancelling values', () => {
  const max = Number.MAX_SAFE_INTEGER;
  assert.deepEqual(summarize([event('a', max, max), event('b', 0, 2), event('c', 0, -max)]),
    [{ customer: 'A', cents: 2, count: 3 }]);
});

test('empty, all void, frozen input and repeated calls', () => {
  assert.deepEqual(summarize([]), []);
  assert.deepEqual(summarize([event('x', 0, 0, 'A', 'void')]), []);
  const input = Object.freeze([Object.freeze(event('x', 0, -1))]);
  const before = JSON.stringify(input);
  const rows = summarize(input);
  rows[0].cents = 99;
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(summarize(input), [{ customer: 'A', cents: -1, count: 1 }]);
});

test('KEEP.txt bytes preserved', () => {
  assert.deepEqual(readFileSync(new URL('./KEEP.txt', import.meta.url)),
    Buffer.from('Unrelated user work. Preserve exactly.\n'));
});
