import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarize } from './summary.mjs';

const event = (id, customer, sequence, cents, state = 'posted') =>
  ({ id, customer, sequence, cents, state });

test('latest valid revision wins, ties follow position, voids remove', () => {
  const events = [
    event('a', 'old', 1, 100), event('a', 'new', 3, 40),
    event('a', 'stale', 2, 900), event('a', 'tie', 3, -20),
    event('b', 'gone', 1, 50), event('b', 'gone', 2, 0, 'void'),
    event('c', 'tie', 0, 25), event('d', 'gone', 2, 0, 'void'),
    event('d', 'back', 3, 7),
  ];
  assert.deepEqual(summarize(events), [
    { customer: 'back', cents: 7, count: 1 },
    { customer: 'tie', cents: 5, count: 2 },
  ]);
});

test('invalid entries ignored before revision selection', () => {
  const good = event('a', 'ok', 0, 10);
  const invalid = [null, undefined, false, 3, 'x', {},
    ...['', null, 3].flatMap(value => [
      { ...good, id: value }, { ...good, customer: value },
    ]),
    ...[-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1'].map(
      sequence => ({ ...good, sequence })),
    ...[0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1'].map(
      cents => ({ ...good, sequence: 99, cents })),
    { ...good, sequence: 99, state: 'pending' },
    { ...good, sequence: 99, state: 'void', customer: '' },
  ];
  assert.deepEqual(summarize([good, ...invalid]), [{ customer: 'ok', cents: 10, count: 1 }]);
});

test('safe map keys, code-unit order, signed values, empty input', () => {
  const customers = ['__proto__', 'constructor', 'toString', '10', '2', 'a', 'A', 'ä', '😀', '\ue000', ' '];
  const events = customers.map((customer, i) => event(customer, customer, i, i === 0 ? -5 : 0));
  assert.deepEqual(summarize(events), [...customers].sort().map(customer => ({
    customer, cents: customer === '__proto__' ? -5 : 0, count: 1,
  })));
  assert.deepEqual(summarize([]), []);
  assert.deepEqual(summarize([event('v', 'v', 0, 0, 'void')]), []);
  assert.deepEqual(summarize([event('max', 'max', Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)]),
    [{ customer: 'max', cents: Number.MAX_SAFE_INTEGER, count: 1 }]);
});

test('does not mutate frozen input or share mutable result state', () => {
  const events = Object.freeze([Object.freeze(event('a', 'x', 0, 5))]);
  const result = summarize(events);
  result[0].cents = 99;
  assert.deepEqual(summarize(events), [{ customer: 'x', cents: 5, count: 1 }]);
  assert.equal(events[0].cents, 5);
});

test('KEEP.txt bytes preserved', () => {
  assert.deepEqual(readFileSync(new URL('./KEEP.txt', import.meta.url)),
    Buffer.from('Unrelated user work. Preserve exactly.\n'));
});

test('void tombstones prevent stale resurrection and ties can restore', () => {
  assert.deepEqual(summarize([
    event('a', 'x', 5, 0, 'void'), event('a', 'x', 4, 9),
  ]), []);
  assert.deepEqual(summarize([
    event('a', 'x', 5, 0, 'void'), event('a', 'y', 5, -9),
  ]), [{ customer: 'y', cents: -9, count: 1 }]);
  assert.deepEqual(summarize([
    event('a', 'x', 5, 9), event('a', 'x', 5, 0, 'void'),
  ]), []);
});
