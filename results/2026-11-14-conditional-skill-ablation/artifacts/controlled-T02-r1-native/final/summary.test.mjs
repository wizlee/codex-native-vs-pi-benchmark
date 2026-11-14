import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarize } from './summary.mjs';
const e = (id, customer, sequence, cents, state = 'posted') => ({id, customer, sequence, cents, state});

test('latest sequence wins, moves customer, ignores stale events', () => {
  assert.deepEqual(summarize([e('x','A',1,10),e('x','B',3,20),e('x','C',2,30)]),
    [{customer:'B',cents:20,count:1}]);
});
test('later ties win, void tombstones prevent stale resurrection, newer post restores', () => {
  assert.deepEqual(summarize([e('x','A',2,10),e('x','A',2,0,'void'),e('x','A',1,50)]), []);
  assert.deepEqual(summarize([e('x','A',2,0,'void'),e('x','B',2,-5)]),
    [{customer:'B',cents:-5,count:1}]);
  assert.deepEqual(summarize([e('x','A',2,0,'void'),e('x','B',3,7)]),
    [{customer:'B',cents:7,count:1}]);
});
test('invalid entries cannot displace valid winner', () => {
  const base = e('x','A',1,9);
  const invalid = [
    null, undefined, false, 4, 'event', {}, [],
    ...['id','customer'].flatMap(key => ['',null,1].map(value => ({...base,sequence:9,[key]:value}))),
    ...[-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'2'].map(sequence => ({...base,sequence})),
    ...[1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'2'].map(cents => ({...base,sequence:9,cents})),
    {...base,sequence:9,state:'pending'},
    {...base,sequence:9,state:'void',cents:undefined}
  ];
  assert.deepEqual(summarize([base,...invalid]), [{customer:'A',cents:9,count:1}]);
});
test('safe keys, refunds, code-unit order, zero totals and whitespace strings', () => {
  assert.deepEqual(summarize([
    e('__proto__','__proto__',0,4),e('constructor','constructor',0,3),
    e('a','a',0,5),e('b','a',0,-5),e('z','Z',0,-2),e('space',' ',0,0)
  ]), [
    {customer:' ',cents:0,count:1},{customer:'Z',cents:-2,count:1},
    {customer:'__proto__',cents:4,count:1},{customer:'a',cents:0,count:2},
    {customer:'constructor',cents:3,count:1}
  ]);
});
test('empty, safe integer boundaries, frozen input', () => {
  assert.deepEqual(summarize([]), []);
  const events = Object.freeze([Object.freeze(e('x','A',Number.MAX_SAFE_INTEGER,-Number.MAX_SAFE_INTEGER))]);
  assert.deepEqual(summarize(events), [{customer:'A',cents:-Number.MAX_SAFE_INTEGER,count:1}]);
  assert.deepEqual(events,[e('x','A',Number.MAX_SAFE_INTEGER,-Number.MAX_SAFE_INTEGER)]);
});
test('KEEP bytes unchanged', () => {
  assert.deepEqual(readFileSync(new URL('./KEEP.txt',import.meta.url)),Buffer.from('Unrelated user work. Preserve exactly.\n'));
});
test('refund cancellation remains exact after temporary overflow', () => {
  assert.deepEqual(summarize([
    e('x','A',0,Number.MAX_SAFE_INTEGER),e('y','A',0,2),
    e('z','A',0,-Number.MAX_SAFE_INTEGER)
  ]), [{customer:'A',cents:2,count:3}]);
});
test('UTF-16 code-unit ordering, not locale or code-point ordering', () => {
  const names = ['\uE000','\u{10000}','10','2','ä','a','A'];
  assert.deepEqual(summarize(names.map((name,i) => e(String(i),name,0,1))).map(row => row.customer),
    ['10','2','A','a','ä','\u{10000}','\uE000']);
});
