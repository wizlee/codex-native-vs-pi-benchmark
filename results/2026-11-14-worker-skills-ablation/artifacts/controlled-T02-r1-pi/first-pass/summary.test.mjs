import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarize } from './summary.mjs';
const event = (id, customer, sequence, cents, state = 'posted') => ({id, customer, sequence, cents, state});

test('latest valid revision moves customer; lower sequence cannot overwrite', () => {
  assert.deepEqual(summarize([event('x','A',1,100), event('x','B',2,250), event('x','C',0,9)]), [{customer:'B',cents:250,count:1}]);
});
test('later position breaks ties; winning void stays tombstone', () => {
  assert.deepEqual(summarize([event('x','A',4,10), event('x','B',4,20)]), [{customer:'B',cents:20,count:1}]);
  assert.deepEqual(summarize([event('x','A',4,10), event('x','A',4,0,'void'), event('x','A',3,90)]), []);
  assert.deepEqual(summarize([event('x','A',4,0,'void'), event('x','B',4,-2)]), [{customer:'B',cents:-2,count:1}]);
  assert.deepEqual(summarize([event('x','A',4,0,'void'), event('x','B',5,7)]), [{customer:'B',cents:7,count:1}]);
});
test('invalid entries ignored before selecting winners', () => {
  const valid = event('x','A',0,2);
  const invalid = [null, undefined, 7, 'bad', {}, ...[
    {id:''}, {id:4}, {customer:''}, {customer:null}, {sequence:-1},
    {sequence:0.5}, {sequence:Number.MAX_SAFE_INTEGER+1}, {sequence:NaN},
    {cents:0.5}, {cents:Infinity}, {cents:Number.MIN_SAFE_INTEGER-1},
    {cents:'2'}, {state:'pending'}, {state:'POSTED'},
    {state:'void',customer:undefined}, {state:'void',cents:undefined}
  ].map(patch => ({...valid, sequence:99, ...patch}))];
  assert.deepEqual(summarize([valid,...invalid]), [{customer:'A',cents:2,count:1}]);
  assert.deepEqual(summarize(invalid), []);
});
test('refunds and zero totals count winning ids', () => {
  assert.deepEqual(summarize([event('a','A',0,10),event('b','A',0,-10),event('c','B',Number.MAX_SAFE_INTEGER,Number.MIN_SAFE_INTEGER)]), [{customer:'A',cents:0,count:2},{customer:'B',cents:Number.MIN_SAFE_INTEGER,count:1}]);
});
test('arbitrary keys and UTF-16 code-unit ordering', () => {
  const names = ['a','2','constructor','__proto__','10','A','\uE000','\u{10000}',' '];
  assert.deepEqual(summarize(names.map((name,i)=>event(name,name,0,i))), [' ','10','2','A','__proto__','a','constructor','\u{10000}','\uE000'].map(customer=>({customer,cents:names.indexOf(customer),count:1})));
});
test('empty input, immutable input, fresh result objects', () => {
  assert.deepEqual(summarize([]), []);
  const input = Object.freeze([Object.freeze(event('x','A',0,0))]);
  const first = summarize(input);
  first[0].cents = 99;
  assert.deepEqual(summarize(input), [{customer:'A',cents:0,count:1}]);
  assert.equal(input[0].cents,0);
});
test('KEEP fixture preserved byte-for-byte', () => {
  assert.deepEqual(readFileSync(new URL('./KEEP.txt',import.meta.url)), Buffer.from('Unrelated user work. Preserve exactly.\n'));
});
