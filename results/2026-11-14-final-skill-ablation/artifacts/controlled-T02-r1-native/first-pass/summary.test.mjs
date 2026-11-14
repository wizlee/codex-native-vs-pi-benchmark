import assert from 'node:assert/strict';
import { summarize } from './summary.mjs';
const event = (id, customer, sequence, cents, state = 'posted') => ({id, customer, sequence, cents, state});
const cases = [
 ['empty', [], []],
 ['exact cancellation', [event('a','A',0,Number.MAX_SAFE_INTEGER),event('b','A',0,2),event('c','A',0,-Number.MAX_SAFE_INTEGER)], [{customer:'A',cents:2,count:3}]],
 ['winner changes customer', [event('a','Alice',1,100),event('a','Bob',2,200)], [{customer:'Bob',cents:200,count:1}]],
 ['sequence beats position', [event('a','B',5,20),event('a','A',1,99)], [{customer:'B',cents:20,count:1}]],
 ['later tie wins', [event('a','A',2,10),event('a','B',2,-4)], [{customer:'B',cents:-4,count:1}]],
 ['void retains sequence barrier', [event('a','A',3,10,'void'),event('a','A',2,90)], []],
 ['void and revival', [event('a','A',1,10),event('a','A',2,0,'void'),event('a','B',3,7)], [{customer:'B',cents:7,count:1}]],
 ['group refunds', [event('a','A',0,10),event('b','A',0,-3)], [{customer:'A',cents:7,count:2}]],
 ['special keys and code units', ['__proto__','constructor','toString','2','10','a','Z','ä'].map((c,i)=>event(c,c,0,i)), ['10','2','Z','__proto__','a','constructor','toString','ä'].map(c=>({customer:c,cents:['__proto__','constructor','toString','2','10','a','Z','ä'].indexOf(c),count:1}))],
 ['invalid entries cannot replace winner', [event('a','A',0,5),null,undefined,1,'x',{}, ...[
 {id:''},{id:2},{customer:''},{customer:3},{sequence:-1},{sequence:1.2},{sequence:Number.MAX_SAFE_INTEGER+1},{sequence:NaN},{sequence:Infinity},{cents:1.2},{cents:NaN},{cents:Infinity},{cents:Number.MAX_SAFE_INTEGER+1},{state:'pending'}
 ].map(p=>({...event('a','B',9,20),...p}))], [{customer:'A',cents:5,count:1}]],
 ['boundaries and whitespace', [event('a',' ',Number.MAX_SAFE_INTEGER,Number.MIN_SAFE_INTEGER),event('b',' ',0,Number.MAX_SAFE_INTEGER)], [{customer:' ',cents:0,count:2}]],
 ['tied void wins', [event('a','A',1,8),event('a','A',1,0,'void')], []],
];
for (const [name,input,expected] of cases) {
 const before = structuredClone(input);
 for (const e of input) if (e && typeof e === 'object') Object.freeze(e);
 Object.freeze(input);
 assert.deepEqual(summarize(input), expected, name);
 assert.deepEqual(input,before, `${name}: input unchanged`);
}
console.log(`PASS ${cases.length} regression cases; frozen inputs unchanged`);
