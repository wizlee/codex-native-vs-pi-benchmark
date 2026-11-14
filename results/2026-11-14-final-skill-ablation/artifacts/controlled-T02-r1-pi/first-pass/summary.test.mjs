import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarize } from './summary.mjs';
const event = (id, customer, sequence, cents, state = 'posted') => ({ id, customer, sequence, cents, state });

test('latest id winner changes customer, sequence beats position, ties favor later', () => {
  assert.deepEqual(summarize([event('x','A',1,100),event('x','B',2,250)]), [{customer:'B',cents:250,count:1}]);
  assert.deepEqual(summarize([event('x','A',3,100),event('x','B',2,250),event('x','C',3,-50)]), [{customer:'C',cents:-50,count:1}]);
});
test('void winners suppress history; stale voids and stale postings cannot replace winners', () => {
  assert.deepEqual(summarize([event('x','A',1,100),event('x','A',3,0,'void'),event('x','A',2,200)]), []);
  assert.deepEqual(summarize([event('x','A',3,100),event('x','A',2,0,'void')]), [{customer:'A',cents:100,count:1}]);
  assert.deepEqual(summarize([event('x','A',1,0,'void'),event('x','B',2,25)]), [{customer:'B',cents:25,count:1}]);
  assert.deepEqual(summarize([event('x','A',1,25),event('x','A',1,0,'void')]), []);
});
test('invalid entries ignored before winner selection, including malformed voids', () => {
  const valid=event('x','A',0,25);
  const invalid=[null,undefined,4,'event',{},[],
    ...['id','customer'].flatMap(key => ['',null,7].map(value => ({...valid,[key]:value,sequence:99}))),
    ...[-1,0.5,Number.MAX_SAFE_INTEGER+1,NaN,Infinity,'2'].map(sequence => ({...valid,sequence})),
    ...[0.5,Number.MAX_SAFE_INTEGER+1,NaN,Infinity,'2'].map(cents => ({...valid,sequence:99,cents})),
    {...valid,sequence:99,state:'pending'}, {...valid,sequence:99,state:'void',customer:''}];
  assert.deepEqual(summarize([valid,...invalid]),[{customer:'A',cents:25,count:1}]);
  assert.deepEqual(summarize(invalid),[]);
});
test('refunds, zero totals, safe integer boundaries and whitespace names', () => {
  assert.deepEqual(summarize([event('a',' ',0,100),event('b',' ',1,-100),event('c','z',Number.MAX_SAFE_INTEGER,0)]),[{customer:' ',cents:0,count:2},{customer:'z',cents:0,count:1}]);
  assert.deepEqual(summarize([event('a','A',0,Number.MAX_SAFE_INTEGER),event('b','B',0,Number.MIN_SAFE_INTEGER)]),[{customer:'A',cents:Number.MAX_SAFE_INTEGER,count:1},{customer:'B',cents:Number.MIN_SAFE_INTEGER,count:1}]);
});
test('special map keys and code-unit customer order', () => {
  const names=['é','a','__proto__','constructor','2','10','A','😀','\uE000'];
  assert.deepEqual(summarize(names.map(name=>event(name,name,0,1))), ['10','2','A','__proto__','a','constructor','é','😀','\uE000'].map(customer=>({customer,cents:1,count:1})));
});
test('empty input and frozen input remain unchanged; result rows are fresh', () => {
  assert.deepEqual(summarize([]),[]);
  const input=Object.freeze([Object.freeze(event('x','A',0,1))]);
  const before=JSON.stringify(input);
  const result=summarize(input); result[0].cents=999;
  assert.equal(JSON.stringify(input),before);
  assert.deepEqual(summarize(input),[{customer:'A',cents:1,count:1}]);
});
test('KEEP.txt preserved byte-for-byte',()=>{
  assert.deepEqual(readFileSync('KEEP.txt'),Buffer.from('Unrelated user work. Preserve exactly.\n'));
});
test('safe final totals stay exact across unsafe intermediate sums', () => {
  assert.deepEqual(summarize([event('a','A',0,Number.MAX_SAFE_INTEGER),event('b','A',0,2),event('c','A',0,-Number.MAX_SAFE_INTEGER)]),[{customer:'A',cents:2,count:3}]);
});
