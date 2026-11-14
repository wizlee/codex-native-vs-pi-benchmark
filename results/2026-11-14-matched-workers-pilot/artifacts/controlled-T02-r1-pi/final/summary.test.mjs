import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarize } from './summary.mjs';

const event = (id, customer, sequence, cents, state = 'posted') =>
  ({ id, customer, sequence, cents, state });

test('latest sequence wins, including customer reassignment', () => {
  assert.deepEqual(summarize([
    event('x', 'A', 1, 100), event('x', 'B', 2, 200), event('x', 'C', 0, 500),
  ]), [{ customer: 'B', cents: 200, count: 1 }]);
});

test('ties use later position; void removes and newer posted restores', () => {
  assert.deepEqual(summarize([
    event('x', 'A', 2, 100), event('x', 'B', 2, -20),
    event('y', 'A', 1, 9), event('y', 'A', 2, 0, 'void'),
    event('z', 'A', 1, 0, 'void'), event('z', 'B', 2, 5),
  ]), [{ customer: 'B', cents: -15, count: 2 }]);
  assert.deepEqual(summarize([event('x', 'A', 1, 10), event('x', 'A', 1, 0, 'void')]), []);
  assert.deepEqual(summarize([event('x', 'A', 3, 0, 'void'), event('x', 'A', 2, 10)]), []);
});

test('invalid entries cannot replace valid winners', () => {
  const base = event('x', 'A', 1, 7);
  const invalid = [null, undefined, 0, 'posted', {},
    { ...base, id: '' }, { ...base, id: 1 },
    { ...base, customer: '' }, { ...base, customer: null },
    ...[-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '2'].map(sequence => ({ ...base, sequence })),
    ...[1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '2'].map(cents => ({ ...base, sequence: 9, cents })),
    { ...base, sequence: 9, state: 'pending' },
    { ...base, sequence: 9, customer: '', state: 'void' },
  ];
  assert.deepEqual(summarize([base, ...invalid]), [{ customer: 'A', cents: 7, count: 1 }]);
});

test('safe maps, signed amounts, code-unit order, whitespace names', () => {
  const customers = ['z', '__proto__', 'constructor', '10', '2', 'A', 'a', 'ä', '😀', '\uE000', ' '];
  const events = customers.map((customer, i) => event(String(i), customer, 0, -i));
  events.push(event('__proto__', 'A', Number.MAX_SAFE_INTEGER, 0));
  const expected = customers.map((customer, i) => ({ customer, cents: 0 - i, count: 1 }));
  expected.find(row => row.customer === 'A').count++;
  expected.sort((a, b) => a.customer < b.customer ? -1 : a.customer > b.customer ? 1 : 0);
  assert.deepEqual(summarize(events), expected);
});

test('empty, safe integer boundaries, frozen input, repeat calls', () => {
  assert.deepEqual(summarize([]), []);
  const events = Object.freeze([
    Object.freeze(event('x', 'A', 0, Number.MIN_SAFE_INTEGER)),
    Object.freeze(event('y', 'A', 0, Number.MAX_SAFE_INTEGER)),
  ]);
  const expected = [{ customer: 'A', cents: 0, count: 2 }];
  assert.deepEqual(summarize(events), expected);
  assert.deepEqual(summarize(events), expected);
  assert.deepEqual(summarize([]), []);
});

test('KEEP fixture preserved exactly', () => {
  assert.deepEqual(readFileSync(new URL('./KEEP.txt', import.meta.url)), Buffer.from('Unrelated user work. Preserve exactly.\n'));
});

test('safe final total survives unsafe intermediate sums', () => {
  assert.deepEqual(summarize([
    event('x', 'A', 0, Number.MAX_SAFE_INTEGER),
    event('y', 'A', 0, 2), event('z', 'A', 0, -2),
  ]), [{ customer: 'A', cents: Number.MAX_SAFE_INTEGER, count: 3 }]);
});
