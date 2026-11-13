import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, realpath } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { makeSchedule, recordTemplates, measureRecord, analyze, prepareTask, quality } from './benchmark.mjs';
import { checkTask } from './check.mjs';

const scores={correctness:4,verification:4,simplicity:4,research:4,instructions:4};
const rates={snapshot_date:'2026-11-12',source:'synthetic test rates',models:{'test/model':{
  input_per_million:2,cached_input_per_million:.5,cache_write_per_million:3,output_per_million:8,
}}};
const execFileAsync=promisify(execFile);
async function withTemporaryDirectory(fn) {
  const directory=await mkdtemp(path.join(os.tmpdir(),'delegation-benchmark-test-'));
  try { return await fn(directory); }
  finally {
    // Resolve exact generated target under OS temp before recursive removal.
    const resolved=await realpath(directory), tmpRoot=await realpath(os.tmpdir());
    const relative=path.relative(tmpRoot,resolved);
    assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative)&&path.basename(resolved).startsWith('delegation-benchmark-test-'));
    await rm(resolved,{recursive:true});
  }
}
function record(planned={run_id:'test-run',task:'T02',repeat:1,arm:'native',profile:'controlled'}) {
  const agent=`${planned.run_id}:root`;
  return {run_id:planned.run_id,profile:planned.profile,task:planned.task,repeat:planned.repeat,arm:planned.arm,
    status:'completed',mandatory_pass:true,critical_defect:false,first_pass_accepted:true,repair_rounds:0,
    scores:{...scores},elapsed_s:120,delivery_s:100,review_s:20,intervention_s:5,
    usage_complete:true,zero_model_calls:false,expected_agent_ids:[agent],other_cost_usd:0,
    usage:[{event_id:`${planned.run_id}:call-1`,agent_id:agent,role:'root',model:'test/model',source:'synthetic fixture',scope:'exclusive_call',
      input_tokens:1000,cached_input_tokens:400,cache_write_tokens:100,output_tokens:300,reasoning_tokens:100}]};
}
function failed(r) {
  return {...r,status:'error',mandatory_pass:false,first_pass_accepted:false,scores:Object.fromEntries(Object.keys(scores).map(k=>[k,0]))};
}

test('schedule reproducible, paired, balanced and correctly sized',()=>{
  const main=makeSchedule('main',42), again=makeSchedule('main',42);
  assert.deepEqual(main,again); assert.equal(main.runs.length,80);
  assert.equal(new Set(main.runs.map(r=>r.blind_id)).size,80);
  assert.equal(main.runs.filter((r,i)=>i%2===0&&r.arm==='pi').length,20);
  assert.equal(makeSchedule('pilot',42).runs.length,8);
  for(let i=0;i<main.runs.length;i+=2) {
    assert.equal(main.runs[i].pair_id,main.runs[i+1].pair_id);
    assert.notEqual(main.runs[i].arm,main.runs[i+1].arm);
  }
});

test('cached input and reasoning counted once; rates use disjoint buckets',()=>{
  const result=measureRecord(record(),rates);
  assert.equal(result.tokens,1300); assert.equal(result.root_tokens,1300);
  assert.ok(Math.abs(result.estimated_api_usd-.0039)<1e-12);
  assert.equal(quality(scores),100);
});

test('record templates cover schedule but cannot masquerade as measurements',()=>{
  const schedule=makeSchedule('pilot',42);
  const records=recordTemplates(schedule).split('\n').map(line=>JSON.parse(line));
  assert.equal(records.length,8); assert.deepEqual(records.map(r=>r.run_id),schedule.runs.map(r=>r.run_id));
  assert.throws(()=>analyze(schedule,records),/Unknown status/);
});

test('missing rates, cache bucket, and incomplete calls stay unknown',()=>{
  assert.equal(measureRecord(record()).estimated_api_usd,null);
  const partial=record(); partial.usage_complete=false;
  const result=measureRecord(partial,rates);
  assert.equal(result.tokens,null); assert.equal(result.observed_tokens,1300);
  assert.equal(result.estimated_api_usd,null);
  const unknownCache=record(); unknownCache.usage[0].cached_input_tokens=null;
  assert.equal(measureRecord(unknownCache,rates).tokens,1300);
  assert.equal(measureRecord(unknownCache,rates).estimated_api_usd,null);
});

test('missing worker coverage and repeated usage events rejected',()=>{
  const r=record(); r.expected_agent_ids.push('missing-worker');
  assert.throws(()=>measureRecord(r),/missing expected agent/);
  const duplicate=record(); duplicate.usage.push({...duplicate.usage[0]});
  assert.throws(()=>measureRecord(duplicate),/Duplicate usage event/);
  const wrongScope=record(); wrongScope.usage[0].scope='tree_total';
  assert.throws(()=>measureRecord(wrongScope),/exclusive_call/);
});

test('failed trials remain cost numerator and acceptance denominator',()=>{
  const schedule=makeSchedule('pilot',42), records=schedule.runs.map(record);
  const index=records.findIndex(r=>r.arm==='pi'); records[index]=failed(records[index]);
  const result=analyze(schedule,records,rates);
  assert.equal(result.arms.pi.acceptance_rate,.75);
  assert.equal(result.arms.pi.tokens_all,5200);
  assert.equal(result.arms.pi.tokens_per_accepted,5200/3);
  assert.equal(result.arms.native.tokens_per_accepted,1300);
  assert.equal(result.paired.both_accepted_pairs,3);
});

test('repair changes first-pass rate and includes its additional model call',()=>{
  const schedule=makeSchedule('pilot',42), records=schedule.runs.map(record);
  const r=records.find(r=>r.arm==='pi'); r.repair_rounds=1; r.first_pass_accepted=false;
  r.usage.push({...r.usage[0],event_id:`${r.run_id}:repair-call`});
  const result=analyze(schedule,records,rates);
  assert.equal(result.arms.pi.first_pass_rate,.75); assert.equal(result.arms.pi.acceptance_rate,1);
  assert.equal(result.arms.pi.tokens_all,6500); assert.equal(result.arms.pi.repair_rounds,1);
});

test('critical defect and missing verification block polished high-score artifact',()=>{
  const r=record(); r.critical_defect=true; r.first_pass_accepted=false;
  assert.equal(measureRecord(r).accepted,false);
  const noProof=record(); noProof.scores.verification=2; noProof.first_pass_accepted=false;
  assert.equal(measureRecord(noProof).quality,90);
  assert.equal(measureRecord(noProof).accepted,false);
});

test('missing scheduled run, duplicate record, and mismatched profile rejected',()=>{
  const schedule=makeSchedule('pilot',42), records=schedule.runs.map(record);
  assert.throws(()=>analyze(schedule,records.slice(1)),/Missing scheduled records/);
  assert.throws(()=>analyze(schedule,[...records,records[0]]),/Duplicate run/);
  const mismatch=structuredClone(records); mismatch[0].profile='usual';
  assert.throws(()=>analyze(schedule,mismatch),/mismatched profile/);
});

test('usage event cannot be reused across trials',()=>{
  const schedule=makeSchedule('pilot',42), records=schedule.runs.map(record);
  records[1].usage[0].event_id=records[0].usage[0].event_id;
  assert.throws(()=>analyze(schedule,records),/reused across runs/);
});

test('one incomplete ledger makes full-arm cost unknown',()=>{
  const schedule=makeSchedule('pilot',42), records=schedule.runs.map(record);
  records.find(r=>r.arm==='pi').usage_complete=false;
  const result=analyze(schedule,records,rates);
  assert.equal(result.arms.pi.tokens_all,null);
  assert.equal(result.paired.tokens_per_accepted_ratio_pi_over_native,null);
  assert.equal(result.arms.pi.observed_tokens_lower_bound,5200);
});

test('task-cluster paired estimates retain pairing',()=>{
  const schedule=makeSchedule('pilot',42), records=schedule.runs.map(record);
  for(const r of records.filter(r=>r.arm==='pi')) r.scores.correctness=3.5;
  const result=analyze(schedule,records);
  assert.equal(result.paired.quality_delta_pi_minus_native,-5);
  assert.equal(result.paired.quality_delta_interval.low,-5);
  assert.equal(result.paired.quality_delta_interval.high,-5);
  assert.equal(result.distinct_tasks,2);
});

test('verified no-model blocked run costs zero; unknown empty ledger does not',()=>{
  const r=failed(record()); r.status='blocked'; r.usage=[]; r.expected_agent_ids=[]; r.zero_model_calls=true;
  assert.equal(measureRecord(r).tokens,0); assert.equal(measureRecord(r).estimated_api_usd,0);
  r.zero_model_calls=false; assert.throws(()=>measureRecord(r),/Empty complete usage/);
  r.usage_complete=false; assert.equal(measureRecord(r).tokens,null);
});

test('overlapping time categories cannot be added into fake elapsed result',()=>{
  const r=record(); r.elapsed_s=100;
  assert.throws(()=>measureRecord(r),/exceeds elapsed/);
});

const solutions={
  T01:{'retry.mjs':`export function retryDelay(a,b,m){
    if(!Number.isSafeInteger(a)||a<0||!Number.isFinite(b)||b<=0||!Number.isFinite(m)||m<b) throw new RangeError();
    return Math.min(m,b*2**a);
  }`},
  T02:{'summary.mjs':`export function summarize(events){
    const latest=new Map();
    for(const e of events){
      if(!e||typeof e.id!=='string'||!e.id||typeof e.customer!=='string'||!e.customer||!Number.isSafeInteger(e.sequence)||e.sequence<0||!Number.isSafeInteger(e.cents)||!['posted','void'].includes(e.state)) continue;
      if(!latest.has(e.id)||latest.get(e.id).sequence<=e.sequence) latest.set(e.id,e);
    }
    const totals=new Map();
    for(const e of latest.values()) if(e.state==='posted'){
      const row=totals.get(e.customer)??{customer:e.customer,cents:0,count:0};
      row.cents+=e.cents;row.count++;totals.set(e.customer,row);
    }
    return [...totals.values()].sort((a,b)=>a.customer<b.customer?-1:a.customer>b.customer?1:0);
  }`},
  T03:{'catalog.mjs':`export function pageItems(items,{after=null,limit=2}={}){
    if(!Number.isSafeInteger(limit)||limit<1||limit>100)throw new RangeError();
    const sorted=[...items].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
    let start=0;if(after!==null){const i=sorted.findIndex(x=>x.id===after);if(i<0)throw new RangeError();start=i+1;}
    const page=sorted.slice(start,start+limit);
    return {items:page,nextCursor:start+limit<sorted.length?page.at(-1).id:null};
  }`, 'client.mjs':`export async function collectAll(fetchPage,{limit=2}={}){
    const items=[],seen=new Set();let after=null;
    do{const page=await fetchPage({after,limit});items.push(...page.items);after=page.nextCursor;
      if(after!==null){if(seen.has(after))throw new Error('cursor cycle');seen.add(after);}
    }while(after!==null);return items;
  }`},
  T07:{'eligibility.mjs':`export function eligible(orders){return orders.filter(o=>o.status==='paid'&&o.kind==='sale'&&Number.isSafeInteger(o.amountCents)&&o.amountCents>=7500);}`},
};

test('real task checkers reject starters, accept working fixtures, preserve user work',async()=>withTemporaryDirectory(async directory=>{
    for(const [id,files] of Object.entries(solutions)) {
      const dest=path.join(directory,id); await prepareTask(id,dest);
      assert.equal((await checkTask(id,dest)).functional_checks_pass,false,`${id} starter should fail`);
      for(const [name,code] of Object.entries(files)) await writeFile(path.join(dest,name),code);
      const result=await checkTask(id,dest);
      assert.equal(result.functional_checks_pass,true,JSON.stringify(result));
      assert.equal(result.human_review_required,true);
      await assert.rejects(()=>prepareTask(id,dest),/EEXIST/);
      assert.match(await readFile(path.join(dest,'KEEP.txt'),'utf8'),/Unrelated user work/);
    }
}));

test('seeded review issues reproduce against actual billing artifact',async()=>withTemporaryDirectory(async directory=>{
  const dest=path.join(directory,'T04'); await prepareTask('T04',dest);
  const b=await import(pathToFileURL(path.join(dest,'billing.mjs')).href);
  assert.equal(b.findInvoice([{id:1,tenantId:'wrong'},{id:1,tenantId:'wanted'}],'wanted',1).tenantId,'wrong');
  assert.equal(b.applyPayment({balanceCents:100},-10).balanceCents,110);
  assert.equal(b.canUseCoupon({expiresAtMs:100},100),true);
  assert.equal(b.priceCents('1.13'),112);
  const invoices=[{totalCents:2},{totalCents:1}]; b.cheapestFirst(invoices);
  assert.equal(invoices[0].totalCents,1);
}));

test('CLI prepares spaced paths, checks real artifact, writes schedules, templates and analysis',async()=>withTemporaryDirectory(async directory=>{
  const cli=fileURLToPath(new URL('./benchmark.mjs',import.meta.url));
  const checker=fileURLToPath(new URL('./check.mjs',import.meta.url));
  const schedulePath=path.join(directory,'schedule.json'), resultPath=path.join(directory,'results.jsonl');
  const templatePath=path.join(directory,'templates.jsonl'), reportPath=path.join(directory,'report.json');
  await execFileAsync(process.execPath,[cli,'schedule','pilot','42','controlled','--out',schedulePath]);
  const schedule=JSON.parse(await readFile(schedulePath,'utf8'));
  assert.deepEqual(schedule,makeSchedule('pilot',42));
  await execFileAsync(process.execPath,[cli,'records',schedulePath,'--out',templatePath]);
  assert.equal((await readFile(templatePath,'utf8')).trim().split('\n').length,8);
  await writeFile(resultPath,schedule.runs.map(r=>JSON.stringify(record(r))).join('\n')+'\n');
  await execFileAsync(process.execPath,[cli,'analyze',schedulePath,resultPath,'--out',reportPath]);
  const report=JSON.parse(await readFile(reportPath,'utf8'));
  assert.equal(report.arms.native.tokens_all,5200); assert.equal(report.arms.native.estimated_api_usd_all,null);
  await assert.rejects(()=>execFileAsync(process.execPath,[cli,'schedule','pilot','42','controlled','--out',schedulePath]),/EEXIST/);
  const dest=path.join(directory,'trial with spaces');
  await execFileAsync(process.execPath,[cli,'prepare','T01',dest]);
  await assert.rejects(()=>execFileAsync(process.execPath,[checker,'T01',dest]),error=>{
    assert.equal(JSON.parse(error.stdout).functional_checks_pass,false); return true;
  });
  await writeFile(path.join(dest,'retry.mjs'),solutions.T01['retry.mjs']);
  const checked=await execFileAsync(process.execPath,[checker,'T01',dest]);
  assert.equal(JSON.parse(checked.stdout).functional_checks_pass,true);
}));
