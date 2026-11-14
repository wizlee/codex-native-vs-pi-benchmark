import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarize } from './summary.mjs';

const event = (id, customer, sequence, cents, state = 'posted') =>
  ({ id, customer, sequence, cents, state });

test('latest valid ID wins before grouping, with position breaking ties', () => {
  assert.deepEqual(summarize([
    event('x', 'A', 1, 100), event('x', 'B', 3, 40),
    event('x', 'C', 2, 80), event('x', 'D', 3, -10),
    event('y', 'D', 0, 25),
  ]), [{ customer: 'D', cents: 15, count: 2 }]);
});

test('void winners remove IDs, newer posts restore them', () => {
  assert.deepEqual(summarize([
    event('x', 'A', 0, 10), event('x', 'A', 1, 0, 'void'),
    event('y', 'A', 2, 0, 'void'), event('y', 'B', 3, 20),
    event('z', 'A', 0, 10), event('z', 'A', 0, 0, 'void'),
  ]), [{ customer: 'B', cents: 20, count: 1 }]);
});

test('invalid entries cannot replace valid events', () => {
  const valid = event('x', 'A', 0, 5);
  const invalid = [null, undefined, false, 7, 'posted', {},
    { id: '', customer: 'A', sequence: 9, cents: 1, state: 'posted' },
    ...[
      ['id', 1], ['customer', ''], ['customer', null],
      ['sequence', -1], ['sequence', 0.5], ['sequence', Number.MAX_SAFE_INTEGER + 1],
      ['sequence', '2'], ['cents', NaN], ['cents', Infinity],
      ['cents', Number.MIN_SAFE_INTEGER - 1], ['cents', 0.1], ['cents', '2'],
      ['state', 'pending'],
    ].map(([key, value]) => ({ ...valid, sequence: 9, [key]: value })),
    { ...valid, sequence: 10, state: 'void', cents: Infinity },
  ];
  assert.deepEqual(summarize([valid, ...invalid]), [{ customer: 'A', cents: 5, count: 1 }]);
});

test('special names and code-unit sorting work without mutating frozen input', () => {
  const names = ['\uE000', '😀', 'a', '__proto__', 'constructor', 'Z', '10', '2'];
  const input = Object.freeze(names.map((name, i) => Object.freeze(event(String(i), name, 0, -i))));
  const before = JSON.stringify(input);
  assert.deepEqual(summarize(input), [...names].sort().map(name => ({
    customer: name, cents: 0 - names.indexOf(name), count: 1,
  })));
  assert.equal(JSON.stringify(input), before);
});

test('empty input and safe integer boundaries', () => {
  assert.deepEqual(summarize([]), []);
  assert.deepEqual(summarize([
    event('x', ' ', Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER),
    event('x', ' ', 1, 3), event('y', ' ', 0, Number.MAX_SAFE_INTEGER),
  ]), [{ customer: ' ', cents: 0, count: 2 }]);
});

test('KEEP.txt remains byte exact', () => {
  assert.deepEqual(readFileSync(new URL('./KEEP.txt', import.meta.url)),
    Buffer.from('Unrelated user work. Preserve exactly.\n'));
});

test('void sequence history survives stale posts and ties can restore', () => {
  assert.deepEqual(summarize([
    event('__proto__', 'A', 5, 0, 'void'), event('__proto__', 'A', 4, 10),
    event('constructor', 'B', 5, 0, 'void'), event('constructor', 'B', 5, 0),
  ]), [{ customer: 'B', cents: 0, count: 1 }]);
});

test('signed sums remain exact when intermediate sums exceed safe range', () => {
  assert.deepEqual(summarize([
    event('a', 'A', 0, Number.MAX_SAFE_INTEGER), event('b', 'A', 0, 2),
    event('c', 'A', 0, -2),
  ]), [{ customer: 'A', cents: Number.MAX_SAFE_INTEGER, count: 3 }]);
});
