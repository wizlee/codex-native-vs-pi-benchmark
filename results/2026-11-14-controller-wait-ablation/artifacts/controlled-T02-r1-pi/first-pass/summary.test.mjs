import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarize } from './summary.mjs';

const event = (overrides = {}) => ({ id: 'x', customer: 'A', sequence: 1, cents: 100, state: 'posted', ...overrides });

test('latest id wins, migrates customer, and ignores older sequence', () => {
  assert.deepEqual(summarize([event(), event({ customer: 'B', sequence: 3, cents: 200 }), event({ sequence: 2 })]), [{ customer: 'B', cents: 200, count: 1 }]);
});

test('position breaks ties, void cancels, newer post resurrects', () => {
  assert.deepEqual(summarize([event(), event({ state: 'void' })]), []);
  assert.deepEqual(summarize([event({ sequence: 5, state: 'void' }), event({ sequence: 4 })]), []);
  assert.deepEqual(summarize([event({ state: 'void' }), event({ sequence: 2, cents: -25 })]), [{ customer: 'A', cents: -25, count: 1 }]);
  assert.deepEqual(summarize([event(), event({ customer: 'B', cents: 0 })]), [{ customer: 'B', cents: 0, count: 1 }]);
});

test('invalid entries cannot replace valid winners', () => {
  const invalid = [null, undefined, false, 42, 'x', {},
    ...['', 1, null].flatMap(value => [event({ id: value }), event({ customer: value })]),
    ...[-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '2'].map(sequence => event({ sequence })),
    ...[1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '5'].map(cents => event({ cents, sequence: 9 })),
    event({ state: 'pending', sequence: 9 }), event({ state: 'void', customer: '', sequence: 9 })];
  assert.deepEqual(summarize([event(), ...invalid]), [{ customer: 'A', cents: 100, count: 1 }]);
});

test('groups refunds and zero values, sorts code units, handles arbitrary keys', () => {
  const names = ['2', '10', '__proto__', 'constructor', 'a', 'Z', 'é', '😀', '\uE000', ' '];
  const events = names.map((customer, i) => event({ id: String(i), customer, sequence: 0, cents: 0 }));
  events.push(event({ id: '__proto__', customer: 'a', cents: -50 }), event({ id: 'constructor', customer: 'a', cents: 20 }));
  assert.deepEqual(summarize(events), [...names].sort().map(customer => ({ customer, cents: customer === 'a' ? -30 : 0, count: customer === 'a' ? 3 : 1 })));
});

test('empty, safe integer limits, input preservation, KEEP bytes', () => {
  assert.deepEqual(summarize([]), []);
  const events = Object.freeze([Object.freeze(event({ sequence: Number.MAX_SAFE_INTEGER, cents: Number.MIN_SAFE_INTEGER }))]);
  const before = JSON.stringify(events);
  assert.deepEqual(summarize(events), [{ customer: 'A', cents: Number.MIN_SAFE_INTEGER, count: 1 }]);
  assert.equal(JSON.stringify(events), before);
  assert.equal(readFileSync(new URL('./KEEP.txt', import.meta.url), 'utf8'), 'Unrelated user work. Preserve exactly.\n');
});
