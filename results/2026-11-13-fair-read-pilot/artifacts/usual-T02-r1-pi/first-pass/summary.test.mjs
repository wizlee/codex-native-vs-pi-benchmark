import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarize } from './summary.mjs';

const event = (id, customer, sequence, cents, state = 'posted') => ({ id, customer, sequence, cents, state });

test('latest valid version wins, ties use position, voids remove and may revive', () => {
  const events = [event('a', 'old', 1, 10), event('a', 'new', 2, -4),
    event('a', 'stale', 0, 100), event('b', 'gone', 3, 5), event('b', 'gone', 4, 0, 'void'),
    event('c', 'first', 2, 3), event('c', 'new', 2, 8),
    event('d', 'gone', 0, 0, 'void'), event('d', 'new', 1, 0)];
  assert.deepEqual(summarize(events), [{ customer: 'new', cents: 4, count: 3 }]);
});

test('invalid entries cannot displace valid winners', () => {
  const valid = event('a', 'ok', 1, 7);
  const invalid = [null, undefined, false, 3, 'text', {},
    ...['id', 'customer'].flatMap(key => ['', 1, null].map(value => ({ ...valid, [key]: value }))),
    ...[-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '2'].map(sequence => ({ ...valid, sequence })),
    ...[1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '2'].map(cents => ({ ...valid, cents })),
    { ...valid, sequence: 9, state: 'pending' }, { ...valid, sequence: 9, cents: null }];
  assert.deepEqual(summarize([valid, ...invalid]), [{ customer: 'ok', cents: 7, count: 1 }]);
});

test('special keys, signed safe integers, and code-unit ordering', () => {
  const customers = ['2', '__proto__', 'constructor', '10', 'a', 'Z', '\u{10000}', '\uE000', ' '];
  const events = customers.map(customer => event(customer, customer, 0, 0));
  events.push(event('max', 'a', Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER));
  events.push(event('refund', 'a', 0, -Number.MAX_SAFE_INTEGER));
  assert.deepEqual(summarize(events), [...customers].sort().map(customer => ({ customer, cents: 0, count: customer === 'a' ? 3 : 1 })));
});

test('empty input and frozen input stay unchanged; rows are fresh', () => {
  assert.deepEqual(summarize([]), []);
  const item = Object.freeze(event('a', 'x', 0, 1));
  const input = Object.freeze([item]);
  const result = summarize(input);
  result[0].cents = 99;
  assert.deepEqual(summarize(input), [{ customer: 'x', cents: 1, count: 1 }]);
  assert.equal(item.cents, 1);
});

test('KEEP fixture preserved byte for byte', () => {
  assert.deepEqual(readFileSync(new URL('./KEEP.txt', import.meta.url)), Buffer.from('Unrelated user work. Preserve exactly.\n'));
});
