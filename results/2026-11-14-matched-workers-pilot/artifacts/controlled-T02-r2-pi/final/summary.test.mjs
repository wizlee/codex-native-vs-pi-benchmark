import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarize } from './summary.mjs';

const event = (overrides = {}) => ({ id: 'x', customer: 'A', sequence: 0, cents: 100, state: 'posted', ...overrides });

test('latest sequence wins, moves customer; older input cannot overwrite', () => {
  assert.deepEqual(summarize([event(), event({ customer: 'B', sequence: 2, cents: 200 }), event({ sequence: 1 })]), [{ customer: 'B', cents: 200, count: 1 }]);
});

test('ties use later position; void removes; newer posted restores', () => {
  assert.deepEqual(summarize([event(), event({ state: 'void' })]), []);
  assert.deepEqual(summarize([event({ state: 'void', sequence: 2 }), event({ sequence: 1 })]), []);
  assert.deepEqual(summarize([event({ state: 'void' }), event({ sequence: 1, cents: -20 })]), [{ customer: 'A', cents: -20, count: 1 }]);
});

test('invalid entries never supersede valid winners', () => {
  const invalid = [null, undefined, false, 4, 'x', {}, ...[
    { id: '' }, { id: 3 }, { customer: '' }, { customer: null },
    { sequence: -1 }, { sequence: 0.5 }, { sequence: Number.MAX_SAFE_INTEGER + 1 },
    { sequence: NaN }, { cents: Infinity }, { cents: 1.5 },
    { cents: Number.MIN_SAFE_INTEGER - 1 }, { state: 'pending' },
    { state: 'void', cents: '0' },
  ].map(x => event({ sequence: 10, ...x }))];
  assert.deepEqual(summarize([event(), ...invalid]), [{ customer: 'A', cents: 100, count: 1 }]);
});

test('safe maps, signed totals, count and code-unit order', () => {
  const names = ['__proto__', 'constructor', '10', '2', 'a', 'Z', '😀', '\uE000'];
  const input = names.map((customer, i) => event({ id: String(i), customer, cents: i }));
  input.push(event({ id: '__proto__', customer: 'a', cents: -10 }));
  assert.deepEqual(summarize(input), [...names].sort().map(customer => ({ customer, cents: names.indexOf(customer) + (customer === 'a' ? -10 : 0), count: customer === 'a' ? 2 : 1 })));
});

test('empty, safe-integer endpoints, frozen input and repeat calls', () => {
  assert.deepEqual(summarize([]), []);
  const input = Object.freeze([Object.freeze(event({ sequence: Number.MAX_SAFE_INTEGER, cents: Number.MIN_SAFE_INTEGER }))]);
  const expected = [{ customer: 'A', cents: Number.MIN_SAFE_INTEGER, count: 1 }];
  assert.deepEqual(summarize(input), expected);
  assert.deepEqual(summarize(input), expected);
  assert.deepEqual(summarize([]), []);
});

test('posted ties, whitespace names, invalid voids, zero totals and exact cancellation', () => {
  assert.deepEqual(summarize([event(), event({ customer: 'B', cents: 0 })]), [{ customer: 'B', cents: 0, count: 1 }]);
  assert.deepEqual(summarize([event(), event({ state: 'void', customer: '', sequence: 9 })]), [{ customer: 'A', cents: 100, count: 1 }]);
  assert.deepEqual(summarize([event({ id: ' ', customer: ' ', cents: 0 })]), [{ customer: ' ', cents: 0, count: 1 }]);
  assert.deepEqual(summarize([Number.MAX_SAFE_INTEGER, 2, -Number.MAX_SAFE_INTEGER].map((cents, i) => event({ id: String(i), cents }))), [{ customer: 'A', cents: 2, count: 3 }]);
});

test('unrelated user work preserved byte-for-byte', () => {
  assert.deepEqual(readFileSync(new URL('./KEEP.txt', import.meta.url)), Buffer.from('Unrelated user work. Preserve exactly.\n'));
});
