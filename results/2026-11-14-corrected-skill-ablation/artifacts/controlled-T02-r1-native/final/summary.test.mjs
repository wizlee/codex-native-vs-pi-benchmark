import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarize } from './summary.mjs';
const event = (id, customer, sequence, cents, state = 'posted') => ({id, customer, sequence, cents, state});
test('latest ID winner moves customer; lower sequence cannot replace', () => {
  assert.deepEqual(summarize([event('x','A',1,100),event('x','B',2,200),event('x','C',0,300)]), [{customer:'B',cents:200,count:1}]);
});
test('ties follow position; void tombstones survive older posts; later post revives', () => {
  assert.deepEqual(summarize([event('x','A',2,10),event('x','B',2,20),event('y','A',5,0,'void'),event('y','A',4,40),event('z','A',1,0,'void'),event('z','B',2,-5)]), [{customer:'B',cents:15,count:2}]);
  assert.deepEqual(summarize([event('x','A',1,10),event('x','B',1,0,'void')]), []);
});
test('invalid entries ignored before winner selection', () => {
  const base = event('x','A',1,7);
  const invalid = [null,undefined,1,'x',{}, ...[
    {id:''},{id:1},{customer:''},{customer:null},{sequence:-1},{sequence:1.5},
    {sequence:Number.MAX_SAFE_INTEGER+1},{sequence:'2'},{cents:NaN},{cents:Infinity},
    {cents:1.5},{cents:Number.MAX_SAFE_INTEGER+1},{cents:'8'},{state:'pending'}
  ].map(p => ({...base,sequence:9,...p}))];
  assert.deepEqual(summarize([base,...invalid]), [{customer:'A',cents:7,count:1}]);
});
test('code-unit ordering, special keys, refunds, grouping, no mutation', () => {
  const input = [event('__proto__','__proto__',0,-3),event('constructor','constructor',0,4),event('a','10',0,1),event('b','2',0,2),event('c','A',0,3),event('d','a',0,0),event('e','A',0,-2),event('f','😀',0,1),event('g','\uE000',0,1)];
  const before = structuredClone(input);
  input.forEach(Object.freeze); Object.freeze(input);
  assert.deepEqual(summarize(input), ['10','2','A','__proto__','a','constructor','😀','\uE000'].map((customer,i)=>({customer,cents:[1,2,1,-3,0,4,1,1][i],count:customer==='A'?2:1})));
  assert.deepEqual(input,before);
});
test('empty, safe integer bounds, whitespace strings', () => {
  assert.deepEqual(summarize([]), []);
  assert.deepEqual(summarize([event(' ',' ',Number.MAX_SAFE_INTEGER,-Number.MAX_SAFE_INTEGER)]), [{customer:' ',cents:-Number.MAX_SAFE_INTEGER,count:1}]);
});
test('KEEP and package fixture bytes preserved', () => {
  const fixtures = JSON.parse(readFileSync(new URL('./work/public-fixture.json',import.meta.url)));
  for (const name of ['KEEP.txt','package.json','PROMPT.md']) assert.equal(readFileSync(new URL(name,import.meta.url),'utf8'),fixtures[name]);
});
test('safe final totals survive unsafe intermediate sums; zero net rows retained', () => {
  assert.deepEqual(summarize([event('a','A',0,Number.MAX_SAFE_INTEGER),event('b','A',0,2),event('c','A',0,-2),event('d','B',0,4),event('e','B',0,-4)]), [{customer:'A',cents:Number.MAX_SAFE_INTEGER,count:3},{customer:'B',cents:0,count:2}]);
});
