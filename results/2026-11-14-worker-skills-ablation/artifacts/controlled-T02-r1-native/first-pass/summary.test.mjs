import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarize } from './summary.mjs';
const e = (id, sequence, cents = 100, customer = 'Alice', state = 'posted') => ({id, sequence, cents, customer, state});
test('latest sequence wins, regardless of arrival order; winning customer owns amount', () => {
  assert.deepEqual(summarize([e('a',2,200,'Bob'),e('a',1),e('b',0,-50,'Bob')]), [{customer:'Bob',cents:150,count:2}]);
});
test('later position breaks ties including void and resurrection', () => {
  assert.deepEqual(summarize([e('a',2),e('a',2,0,'Alice','void'),e('a',1),e('b',1,0,'Bob','void'),e('b',1,-25,'Carol')]), [{customer:'Carol',cents:-25,count:1}]);
});
test('invalid entries cannot replace valid winners', () => {
  const valid = e('a',1);
  const invalid = [null,undefined,false,7,'x',{}, ...['id','customer'].flatMap(key => ['',null,2].map(value => ({...e('a',9),[key]:value}))), ...[-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'9'].map(sequence => ({...e('a',9),sequence})), ...[1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'9'].map(cents => ({...e('a',9),cents})), {...e('a',9),state:'pending'}, {...e('a',9),state:'void',cents:null}];
  assert.deepEqual(summarize([valid,...invalid]), [{customer:'Alice',cents:100,count:1}]);
});
test('code-unit order, special object keys, whitespace strings, safe signed cents', () => {
  const names = ['2','10','__proto__','constructor','toString','a','Z','ä','😀','\uE000',' '];
  const expected = [...names].sort().map(customer => ({customer,cents:0,count:1}));
  assert.deepEqual(summarize(names.map((name,i) => e(name,i,0,name))), expected);
  assert.deepEqual(summarize([e('__proto__',Number.MAX_SAFE_INTEGER,Number.MIN_SAFE_INTEGER)]), [{customer:'Alice',cents:Number.MIN_SAFE_INTEGER,count:1}]);
});
test('empty, void-only, input immutability', () => {
  assert.deepEqual(summarize([]), []);
  assert.deepEqual(summarize([e('a',0,0,'Alice','void')]), []);
  const events = Object.freeze([Object.freeze(e('a',0)),Object.freeze(e('a',1,-10))]);
  const before = JSON.stringify(events);
  assert.deepEqual(summarize(events), [{customer:'Alice',cents:-10,count:1}]);
  assert.equal(JSON.stringify(events), before);
});
test('unrelated user work preserved byte for byte', () => {
  assert.deepEqual(readFileSync(new URL('./KEEP.txt',import.meta.url)), Buffer.from('Unrelated user work. Preserve exactly.\n'));
});
test('safe final totals remain exact across unsafe intermediate sums', () => {
  assert.deepEqual(summarize([e('a',0,Number.MAX_SAFE_INTEGER),e('b',0,2),e('c',0,-Number.MAX_SAFE_INTEGER)]), [{customer:'Alice',cents:2,count:3}]);
});
test('ordinary duplicate reproduction', () => {
  assert.deepEqual(summarize([e('a',1,100),e('a',2,200)]), [{customer:'Alice',cents:200,count:1}]);
});
