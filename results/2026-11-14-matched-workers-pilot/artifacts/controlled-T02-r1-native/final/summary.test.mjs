import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarize } from './summary.mjs';
const e = (id, customer, sequence, cents, state = 'posted') => ({id, customer, sequence, cents, state});
test('latest valid id wins, regardless of input sequence order', () => {
  assert.deepEqual(summarize([e('x','A',1,100),e('x','B',2,25),e('x','C',0,99)]), [{customer:'B',cents:25,count:1}]);
});
test('position breaks ties; void removes, newer posted restores', () => {
  assert.deepEqual(summarize([e('x','A',1,100),e('x','B',1,25)]), [{customer:'B',cents:25,count:1}]);
  assert.deepEqual(summarize([e('x','A',2,100),e('x','A',2,0,'void'),e('x','A',1,5)]), []);
  assert.deepEqual(summarize([e('x','A',1,0,'void'),e('x','B',2,-25)]), [{customer:'B',cents:-25,count:1}]);
});
test('invalid entries cannot replace valid winner, including invalid void', () => {
  const base = e('x','A',0,5);
  const invalid = [null, undefined, 4, 'x', {}, ...[
    {id:''},{id:4},{customer:''},{customer:null},{sequence:-1},{sequence:0.5},
    {sequence:Number.MAX_SAFE_INTEGER+1},{sequence:NaN},{sequence:'2'},
    {cents:Infinity},{cents:0.1},{cents:Number.MIN_SAFE_INTEGER-1},{cents:'3'},
    {state:'pending'}, {customer:'',state:'void'}
  ].map(p => ({...base, sequence:2, ...p}))];
  assert.deepEqual(summarize([base,...invalid]), [{customer:'A',cents:5,count:1}]);
});
test('groups refunds and zero; safe keys; code-unit ordering', () => {
  const customers = ['z','10','2','__proto__','constructor','A','a','😀','\uE000',' '];
  const input = customers.map((c,i) => e(String(i),c,0,0));
  input.push(e('refund','a',1,-5),e('charge','a',1,8));
  const expected = [...customers].sort().map(customer => ({customer,cents:customer==='a'?3:0,count:customer==='a'?3:1}));
  assert.deepEqual(summarize(input),expected);
});
test('safe integer boundaries accepted; empty input; input unchanged', () => {
  assert.deepEqual(summarize([]), []);
  const input = Object.freeze([Object.freeze(e('x','A',Number.MAX_SAFE_INTEGER,Number.MIN_SAFE_INTEGER))]);
  const before = JSON.stringify(input);
  assert.deepEqual(summarize(input), [{customer:'A',cents:Number.MIN_SAFE_INTEGER,count:1}]);
  assert.equal(JSON.stringify(input),before);
});
test('KEEP bytes preserved', () => {
  assert.deepEqual(readFileSync(new URL('./KEEP.txt',import.meta.url)),Buffer.from('Unrelated user work. Preserve exactly.\n'));
});
test('exact cancellation even when intermediate sums exceed safe range', () => {
  const max = Number.MAX_SAFE_INTEGER;
  assert.deepEqual(summarize([e('x','A',0,max),e('y','A',0,2),e('z','A',0,-max)]), [{customer:'A',cents:2,count:3}]);
});
test('stale void cannot erase newer posted; reserved ids stay independent', () => {
  assert.deepEqual(summarize([e('__proto__','A',2,4),e('__proto__','A',1,0,'void'),e('constructor','A',0,-4)]), [{customer:'A',cents:0,count:2}]);
});
