import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { taskFiles, TASK_IDS } from './cases.mjs';

export async function checkTask(id, directory) {
  if (!TASK_IDS.includes(id)) throw new Error(`Unknown task ${id}`);
  const base = path.resolve(directory);
  const load = file => import(pathToFileURL(path.join(base, file)).href + `?check=${randomUUID()}`);
  const results = [];
  async function check(name, fn) {
    try { await fn(); results.push({name, pass: true}); }
    catch (error) { results.push({name, pass: false, detail: error.message}); }
  }
  await check('unrelated user work preserved', async () => {
    assert.equal(await readFile(path.join(base, 'KEEP.txt'), 'utf8'), taskFiles(id)['KEEP.txt']);
  });
  if (id === 'T01') {
    const {retryDelay: f} = await load('retry.mjs');
    await check('base, exponential progression, cap', () => {
      assert.equal(f(0, 100, 500), 100); assert.equal(f(1, 100, 500), 200);
      assert.equal(f(3, 100, 500), 500); assert.equal(f(Number.MAX_SAFE_INTEGER, 100, 500), 500);
    });
    await check('invalid boundary arguments', () => {
      for (const args of [[-1,1,2],[0.5,1,2],[NaN,1,2],[Infinity,1,2],['0',1,2],[0,0,2],[0,1,0],[0,2,1],[0,Infinity,3],[0,1,NaN],[0,1,Infinity]]) {
        assert.throws(() => f(...args), RangeError);
      }
    });
  } else if (id === 'T02') {
    const {summarize: f} = await load('summary.mjs');
    const e = (id, customer, sequence, cents, state='posted') => ({id,customer,sequence,cents,state});
    await check('latest state, tie, customer move, signed amounts, sort', () => {
      const input = [e('a','Z',1,100),e('a','B',2,200),e('b','A',1,50),e('b','A',2,50,'void'),e('c','B',1,-25),e('c','B',1,-30),e('d','A',0,9)];
      const before = structuredClone(input);
      assert.deepEqual(f(input), [{customer:'A',cents:9,count:1},{customer:'B',cents:170,count:2}]);
      assert.deepEqual(input,before);
    });
    await check('invalid entries do not displace valid event', () => {
      assert.deepEqual(f([null,{},e('a','x',2,10),e('a','x',3,NaN),e('a','x',1,5),e('b','x',1,3.5),e('c','x',-1,5),e('d','',1,5)]), [{customer:'x',cents:10,count:1}]);
    });
    await check('special keys, void then recreation, empty', () => {
      assert.deepEqual(f([e('__proto__','__proto__',0,5),e('x','a',2,0,'void'),e('x','a',3,7)]), [{customer:'__proto__',cents:5,count:1},{customer:'a',cents:7,count:1}]);
      assert.deepEqual(f([]),[]);
    });
    await check('customer ordering uses code units', () => {
      assert.deepEqual(f([e('x','a',0,1),e('y','Z',0,2)]),[{customer:'Z',cents:2,count:1},{customer:'a',cents:1,count:1}]);
    });
  } else if (id === 'T03') {
    const {pageItems: page} = await load('catalog.mjs');
    const {collectAll: collect} = await load('client.mjs');
    const items = [{id:'d'},{id:'b'},{id:'a'},{id:'c'}];
    await check('sorted traversal, final cursor, input untouched', async () => {
      const before = structuredClone(items);
      assert.deepEqual(page(items), {items:[{id:'a'},{id:'b'}],nextCursor:'b'});
      assert.deepEqual(page(items,{after:'b',limit:2}), {items:[{id:'c'},{id:'d'}],nextCursor:null});
      assert.deepEqual(await collect(async opts => page(items,opts),{limit:1}),[{id:'a'},{id:'b'},{id:'c'},{id:'d'}]);
      assert.deepEqual(items,before);
    });
    await check('empty, unknown cursor, invalid limit', () => {
      assert.deepEqual(page([]),{items:[],nextCursor:null});
      assert.deepEqual(page(items,{after:'d'}),{items:[],nextCursor:null});
      assert.throws(()=>page(items,{after:'missing'}),RangeError);
      for(const limit of [0,-1,1.5,101,NaN,'2']) assert.throws(()=>page(items,{limit}),RangeError);
      assert.deepEqual(page([{id:'a'},{id:'_'},{id:'Z'}],{limit:3}).items,[{id:'Z'},{id:'_'},{id:'a'}]);
    });
    await check('client prevents cycle and propagates error', async () => {
      let calls=0;
      await assert.rejects(()=>collect(async () => {
        if(++calls>4) throw new Error('test guard reached');
        return {items:[],nextCursor:'same'};
      }));
      assert.ok(calls<=3,'repeated cursor must be rejected promptly');
      await assert.rejects(()=>collect(async()=>{throw new Error('fetch failed');}), /fetch failed/);
    });
  } else if (id === 'T07') {
    const {eligible: f} = await load('eligibility.mjs');
    await check('corrected threshold, kind, status, integer, immutability', () => {
      const input = [
        {id:1,status:'paid',kind:'sale',amountCents:7499},
        {id:2,status:'paid',kind:'sale',amountCents:7500},
        {id:3,status:'paid',kind:'refund',amountCents:8000},
        {id:4,status:'pending',kind:'sale',amountCents:9000},
        {id:5,status:'paid',kind:'sale',amountCents:8000},
        {id:6,status:'paid',kind:'sale',amountCents:8000.1},
        {id:7,status:'paid',kind:'sale',amountCents:'8000'},
      ];
      const before=structuredClone(input);
      assert.deepEqual(f(input),[input[1],input[4]]); assert.deepEqual(input,before);
    });
  } else {
    const file = {T04:'REVIEW.md',T05:'DECISION.md',T06:'PLAN.md',T08:'DECISION.md'}[id];
    await check('required human-review artifact exists',async()=>assert.ok((await readFile(path.join(base,file),'utf8')).trim().length>0));
  }
  return {task:id, functional_checks_pass: results.every(r=>r.pass), human_review_required:true, checks:results};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result=await checkTask(process.argv[2],process.argv[3]??'.');
    console.log(JSON.stringify(result,null,2)); process.exitCode=result.functional_checks_pass?0:1;
  } catch(error) { console.error(error.message); process.exitCode=1; }
}
