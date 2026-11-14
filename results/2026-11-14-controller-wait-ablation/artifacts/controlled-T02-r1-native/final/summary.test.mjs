import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarize } from './summary.mjs';

const event = (id, sequence, cents, customer = 'Ada', state = 'posted') =>
  ({ id, sequence, cents, customer, state });

test('signed cancellation remains exact beyond safe intermediate totals', () => {
  const max = Number.MAX_SAFE_INTEGER;
  for (const amounts of [[max, 2, -max], [-max, -2, max], [max, max, -max, -max, 2]]) {
    assert.deepEqual(summarize(amounts.map((cents, i) => event(String(i), 0, cents, 'x'))),
      [{ customer: 'x', cents: amounts[0] < 0 ? -2 : 2, count: amounts.length }]);
  }
});

test('latest sequence wins, later position breaks ties, customer follows winner', () => {
  assert.deepEqual(summarize([
    event('x', 1, 100), event('x', 2, 250),
  ]), [{ customer: 'Ada', cents: 250, count: 1 }]);
  assert.deepEqual(summarize([
    event('x', 5, 20), event('x', 2, 900), event('x', 5, -10, 'Bob'),
    event('y', 0, 30, 'Bob'),
  ]), [{ customer: 'Bob', cents: 20, count: 2 }]);
});

test('void remains a winner and can be superseded', () => {
  assert.deepEqual(summarize([
    event('x', 3, 0, 'Ada', 'void'), event('x', 2, 20),
    event('y', 0, 5), event('y', 0, 0, 'Ada', 'void'),
  ]), []);
  assert.deepEqual(summarize([
    event('x', 1, 0, 'Ada', 'void'), event('x', 2, -5),
  ]), [{ customer: 'Ada', cents: -5, count: 1 }]);
});

test('invalid entries cannot replace valid winners', () => {
  const base = event('x', 2, 10);
  const invalid = [null, undefined, false, 7, 'bad', {},
    ...['', null, 2].map(id => ({ ...base, id })),
    ...['', null, 2].map(customer => ({ ...base, customer })),
    ...[-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '3'].map(sequence => ({ ...base, sequence })),
    ...[0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '3'].map(cents => ({ ...base, cents })),
    { ...base, sequence: 10, state: 'draft' },
    { ...base, sequence: 10, state: 'void', cents: null },
  ];
  assert.deepEqual(summarize([base, ...invalid]), [{ customer: 'Ada', cents: 10, count: 1 }]);
});

test('safe boundaries, special keys, whitespace and code-unit ordering', () => {
  const names = ['é', '__proto__', 'constructor', '10', '2', 'a', 'Z', ' '];
  assert.deepEqual(summarize(names.map((name, i) => event(name, 0, i, name))),
    [...names].sort().map(customer => ({ customer, cents: names.indexOf(customer), count: 1 })));
  assert.deepEqual(summarize([
    event('__proto__', Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER),
    event('constructor', 0, Number.MAX_SAFE_INTEGER),
  ]), [{ customer: 'Ada', cents: 0, count: 2 }]);
});

test('empty input, zero totals, no input mutation or output aliasing', () => {
  assert.deepEqual(summarize([]), []);
  const input = Object.freeze([Object.freeze(event('x', 0, 5)), Object.freeze(event('y', 0, -5))]);
  const before = JSON.stringify(input);
  const result = summarize(input);
  assert.deepEqual(result, [{ customer: 'Ada', cents: 0, count: 2 }]);
  result[0].cents = 99;
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(summarize(input), [{ customer: 'Ada', cents: 0, count: 2 }]);
});

test('KEEP bytes remain exact', () => {
  assert.deepEqual(readFileSync(new URL('./KEEP.txt', import.meta.url)),
    Buffer.from('Unrelated user work. Preserve exactly.\n'));
});
