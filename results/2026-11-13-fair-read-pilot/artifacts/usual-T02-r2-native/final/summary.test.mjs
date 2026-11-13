import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarize } from './summary.mjs';

const event = (id, sequence, customer = 'A', cents = 10, state = 'posted') =>
  ({ id, sequence, customer, cents, state });

test('latest valid version wins, ties use later position, voids remove and posts revive', () => {
  assert.deepEqual(summarize([
    event('x', 3, 'old'), event('x', 1), event('x', 3, 'B', -7),
    event('gone', 1), event('gone', 2, 'A', 0, 'void'),
    event('back', 2, 'A', 0, 'void'), event('back', 3, 'B', 12),
    event('x', 4, '', 100),
  ]), [{ customer: 'B', cents: 5, count: 2 }]);
});

test('invalid entries ignored before winner selection', () => {
  const valid = event('x', 1);
  const invalid = [null, undefined, false, 3, 'posted', [], {},
    ...['', 2, null].flatMap(value => [
      { ...valid, id: value }, { ...valid, customer: value },
    ]),
    ...[-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '2'].map(sequence => ({ ...valid, sequence })),
    ...[0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '2'].map(cents => ({ ...valid, sequence: 2, cents })),
    { ...valid, sequence: 2, state: 'pending' },
  ];
  assert.deepEqual(summarize([valid, ...invalid]), [{ customer: 'A', cents: 10, count: 1 }]);
});

test('safe map keys and code-unit customer ordering', () => {
  const names = ['é', 'a', 'Z', '2', '10', '__proto__', 'constructor', '😀', '\uE000'];
  assert.deepEqual(summarize(names.map(name => event(name, 0, name, 0))),
    ['10', '2', 'Z', '__proto__', 'a', 'constructor', 'é', '😀', '\uE000']
      .map(customer => ({ customer, cents: 0, count: 1 })));
});

test('exact signed sums even when intermediate sum exceeds safe integer range', () => {
  assert.deepEqual(summarize([
    event('a', 0, 'A', Number.MAX_SAFE_INTEGER), event('b', 0, 'A', 2),
    event('c', 0, 'A', -Number.MAX_SAFE_INTEGER),
  ]), [{ customer: 'A', cents: 2, count: 3 }]);
});

test('empty, whitespace names, safe boundaries and frozen input', () => {
  assert.deepEqual(summarize([]), []);
  const events = Object.freeze([
    Object.freeze(event(' ', Number.MAX_SAFE_INTEGER, ' ', Number.MIN_SAFE_INTEGER)),
    Object.freeze(event('zero', 0, ' ', Number.MAX_SAFE_INTEGER)),
  ]);
  const before = structuredClone(events);
  assert.deepEqual(summarize(events), [{ customer: ' ', cents: 0, count: 2 }]);
  assert.deepEqual(events, before);
});

test('KEEP bytes remain exact', () => {
  assert.deepEqual(readFileSync(new URL('./KEEP.txt', import.meta.url)),
    Buffer.from('Unrelated user work. Preserve exactly.\n'));
});
