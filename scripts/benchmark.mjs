import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { taskFiles, TASK_IDS } from './cases.mjs';

const WEIGHTS = {correctness:40, verification:20, simplicity:15, research:15, instructions:10};
const ARMS = ['native','pi'];
const STATUSES = ['completed','timeout','blocked','error','cancelled'];
const mean = values => values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
const sum = values => values.reduce((a,b)=>a+b,0);
const ratio = (a,b) => a !== null && b !== null && b > 0 ? a/b : null;
const fullSum = values => values.some(v=>v===null) ? null : sum(values);
const median = values => {
  if(!values.length) return null;
  const a=[...values].sort((x,y)=>x-y), m=Math.floor(a.length/2);
  return a.length%2 ? a[m] : (a[m-1]+a[m])/2;
};
function need(condition,message) { if(!condition) throw new Error(message); }
function nonnegative(value,name,integer=false) {
  need(typeof value==='number' && Number.isFinite(value) && value>=0 && (!integer || Number.isSafeInteger(value)),`Invalid ${name}`);
}
function textField(value,name) { need(typeof value==='string' && value.trim().length>0,`Missing ${name}`); }
function bool(value,name) { need(typeof value==='boolean',`Invalid ${name}`); }
function rng(seed) {
  let x=seed>>>0;
  return () => { x=(x+0x6D2B79F5)>>>0; let t=Math.imul(x^(x>>>15),1|x); t^=t+Math.imul(t^(t>>>7),61|t); return ((t^(t>>>14))>>>0)/4294967296; };
}
function shuffle(values,random) {
  const out=[...values];
  for(let i=out.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [out[i],out[j]]=[out[j],out[i]]; }
  return out;
}

export function makeSchedule(stage='pilot',seed=20261112,profile='controlled') {
  need(['pilot','main'].includes(stage),'Stage must be pilot or main');
  need(['controlled','usual'].includes(profile),'Profile must be controlled or usual');
  need(Number.isSafeInteger(seed) && seed>=0 && seed<=0xffffffff,'Seed must be uint32');
  const tasks=stage==='pilot'?['T02','T05']:TASK_IDS;
  const repeats=stage==='pilot'?2:5, random=rng(seed), pairs=[];
  for(const task of tasks) for(let repeat=1;repeat<=repeats;repeat++) pairs.push({task,repeat});
  const ordered=shuffle(pairs,random);
  // Balance first backend, then randomize assignment of order to paired blocks.
  const firstArms=shuffle(ordered.map((_,i)=>ARMS[i%2]),random);
  const blindIds=shuffle(Array.from({length:ordered.length*2},(_,i)=>`artifact-${String(i+1).padStart(3,'0')}`),random);
  const runs=[];
  for(const [i,pair] of ordered.entries()) {
    const first=firstArms[i], second=first==='native'?'pi':'native';
    for(const arm of [first,second]) runs.push({
      order:runs.length+1, run_id:`${profile}-${pair.task}-r${pair.repeat}-${arm}`,
      pair_id:`${profile}-${pair.task}-r${pair.repeat}`,profile,...pair,arm,blind_id:blindIds[runs.length],
    });
  }
  return {schema_version:1,stage,seed,profile,task_weighting:'equal; equal repetitions',runs};
}

export function recordTemplates(schedule) {
  need(schedule?.schema_version===1&&Array.isArray(schedule.runs),'Invalid schedule');
  return schedule.runs.map(p=>JSON.stringify({
    run_id:p.run_id,profile:p.profile,task:p.task,repeat:p.repeat,arm:p.arm,
    status:'pending',mandatory_pass:null,critical_defect:null,first_pass_accepted:null,repair_rounds:null,
    scores:Object.fromEntries(Object.keys(WEIGHTS).map(k=>[k,null])),
    elapsed_s:null,delivery_s:null,review_s:null,intervention_s:null,
    usage_complete:false,zero_model_calls:false,expected_agent_ids:[],other_cost_usd:null,usage:[],
    diagnostics:{note:'Fill actual outcome and evidence. Pending records intentionally fail analysis.'},
  })).join('\n');
}

export async function prepareTask(id,destination) {
  const files=taskFiles(id), base=path.resolve(destination);
  await mkdir(path.dirname(base),{recursive:true});
  // Existing destination is an error. Never overwrite previous trial or user work.
  await mkdir(base);
  for(const [name,body] of Object.entries(files)) await writeFile(path.join(base,name),body,{flag:'wx'});
  const hashes=Object.fromEntries(Object.entries(files).map(([name,body])=>[name,createHash('sha256').update(body).digest('hex')]));
  await writeFile(path.join(base,'.benchmark-baseline.json'),JSON.stringify({task:id,sha256:hashes},null,2)+'\n',{flag:'wx'});
  return {task:id,directory:base,files:Object.keys(files),note:'Only public files prepared. Reviewer checks remain in kit.'};
}

export function quality(scores) {
  need(scores && typeof scores==='object','Missing scores');
  for(const key of Object.keys(WEIGHTS)) {
    nonnegative(scores[key],`score ${key}`); need(scores[key]<=4,`Score ${key} exceeds 4`);
  }
  return sum(Object.entries(WEIGHTS).map(([key,weight])=>weight*scores[key]/4));
}
function accepted(r,q) {
  return r.status==='completed' && r.mandatory_pass && !r.critical_defect && q>=80
    && r.scores.correctness>=3 && r.scores.verification>=3 && r.scores.instructions>=3;
}
function rateCharge(tokens,rate) {
  if(tokens===0) return 0;
  return typeof rate==='number' && Number.isFinite(rate) && rate>=0 ? tokens*rate/1e6 : null;
}
export function measureRecord(r,rates={}) {
  textField(r.run_id,'run_id');
  need(ARMS.includes(r.arm),'Unknown arm'); need(TASK_IDS.includes(r.task),'Unknown task');
  need(['controlled','usual'].includes(r.profile),'Unknown profile');
  need(Number.isSafeInteger(r.repeat)&&r.repeat>0,'Invalid repeat');
  need(STATUSES.includes(r.status),'Unknown status');
  for(const k of ['mandatory_pass','critical_defect','first_pass_accepted','usage_complete','zero_model_calls']) bool(r[k],k);
  need([0,1].includes(r.repair_rounds),'repair_rounds must be 0 or 1');
  const q=quality(r.scores), ok=accepted(r,q);
  need(!r.first_pass_accepted || (ok&&r.repair_rounds===0),'First-pass acceptance contradicts final record');
  need(r.repair_rounds!==0 || r.first_pass_accepted===ok,'No-repair final acceptance must equal first pass');
  for(const k of ['elapsed_s','delivery_s','review_s','intervention_s']) nonnegative(r[k],k);
  if(r.human_effort_measured!==undefined) bool(r.human_effort_measured,'human_effort_measured');
  need(r.delivery_s+r.review_s<=r.elapsed_s+1,'Delivery/review exceeds elapsed time');
  need(r.review_s+r.intervention_s<=r.elapsed_s+1,'Human active time exceeds elapsed time');
  need(Array.isArray(r.usage),'Missing usage array');
  need(Array.isArray(r.expected_agent_ids),'Missing expected_agent_ids');
  for(const id of r.expected_agent_ids) textField(id,'expected agent ID');
  const expected=new Set(r.expected_agent_ids); need(expected.size===r.expected_agent_ids.length,'Duplicate expected agent');
  if(r.other_cost_usd!==null) nonnegative(r.other_cost_usd,'other_cost_usd');
  const seen=new Set(), observedAgents=new Set(), calls=[];
  for(const u of r.usage) {
    for(const k of ['event_id','agent_id','model','source']) textField(u[k],k);
    need(!seen.has(u.event_id),`Duplicate usage event ${u.event_id}`); seen.add(u.event_id);
    need(expected.has(u.agent_id),`Unregistered agent ${u.agent_id}`); observedAgents.add(u.agent_id);
    need(['root','worker'].includes(u.role),'Invalid usage role');
    need(u.scope==='exclusive_call','Usage must be exclusive_call; cumulative/tree counters need conversion');
    for(const k of ['input_tokens','output_tokens']) nonnegative(u[k],k,true);
    for(const k of ['cached_input_tokens','cache_write_tokens','reasoning_tokens']) if(u[k]!==null) nonnegative(u[k],k,true);
    if(u.cached_input_tokens!==null&&u.cache_write_tokens!==null) need(u.cached_input_tokens+u.cache_write_tokens<=u.input_tokens,'Cache subsets exceed input');
    if(u.reasoning_tokens!==null) need(u.reasoning_tokens<=u.output_tokens,'Reasoning subset exceeds output');
    const p=rates.models?.[u.model]; let estimate=null;
    if(u.cached_input_tokens!==null&&u.cache_write_tokens!==null) estimate=fullSum([
      rateCharge(u.input_tokens-u.cached_input_tokens-u.cache_write_tokens,p?.input_per_million),
      rateCharge(u.cached_input_tokens,p?.cached_input_per_million),
      rateCharge(u.cache_write_tokens,p?.cache_write_per_million),
      rateCharge(u.output_tokens,p?.output_per_million),
    ]);
    calls.push({...u,tokens:u.input_tokens+u.output_tokens,estimate});
  }
  if(r.zero_model_calls) need(r.usage_complete&&expected.size===0&&calls.length===0,'Zero model calls requires complete empty ledger');
  if(r.usage_complete&&!r.zero_model_calls) {
    need(calls.length>0,'Empty complete usage requires verified zero_model_calls');
    need([...expected].every(id=>observedAgents.has(id)),'Complete usage missing expected agent');
  }
  const observed=sum(calls.map(c=>c.tokens));
  const tokens=r.usage_complete?observed:null;
  const rawCost=r.usage_complete?fullSum([...calls.map(c=>c.estimate),r.other_cost_usd]):null;
  // Rates without provenance cannot support dollar estimate.
  const rateMetadata=typeof rates.snapshot_date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(rates.snapshot_date)
    && typeof rates.source==='string' && rates.source.trim().length>0;
  const estimated_api_usd=r.zero_model_calls?rawCost:rateMetadata?rawCost:null;
  return {...r,quality:q,accepted:ok,tokens,observed_tokens:observed,estimated_api_usd,
    root_tokens:r.usage_complete?sum(calls.filter(c=>c.role==='root').map(c=>c.tokens)):null,
    worker_tokens:r.usage_complete?sum(calls.filter(c=>c.role==='worker').map(c=>c.tokens)):null,
    human_s:r.human_effort_measured===false?null:r.review_s+r.intervention_s};
}

function armSummary(rows) {
  const n=rows.length, successful=rows.filter(r=>r.accepted), acceptedCount=successful.length;
  const tokens=fullSum(rows.map(r=>r.tokens)), dollars=fullSum(rows.map(r=>r.estimated_api_usd));
  return {runs:n,accepted:acceptedCount,acceptance_rate:ratio(acceptedCount,n),
    first_pass_rate:ratio(rows.filter(r=>r.first_pass_accepted).length,n),
    quality_mean:mean(rows.map(r=>r.quality)),
    dimension_means:Object.fromEntries(Object.keys(WEIGHTS).map(k=>[k,mean(rows.map(r=>r.scores[k]))])),
    statuses:Object.fromEntries(STATUSES.map(s=>[s,rows.filter(r=>r.status===s).length])),
    tokens_all:tokens,observed_tokens_lower_bound:sum(rows.map(r=>r.observed_tokens)),
    token_coverage_complete:rows.every(r=>r.usage_complete),tokens_per_accepted:ratio(tokens,acceptedCount),
    root_tokens:fullSum(rows.map(r=>r.root_tokens)),worker_tokens:fullSum(rows.map(r=>r.worker_tokens)),
    estimated_api_usd_all:dollars,estimated_api_usd_per_accepted:ratio(dollars,acceptedCount),
    elapsed_median_s:median(rows.map(r=>r.elapsed_s)),successful_elapsed_median_s:median(successful.map(r=>r.elapsed_s)),
    elapsed_s_per_accepted:ratio(sum(rows.map(r=>r.elapsed_s)),acceptedCount),
    delivery_median_s:median(rows.map(r=>r.delivery_s)),review_median_s:rows.every(r=>r.human_effort_measured!==false)?median(rows.map(r=>r.review_s)):null,
    human_effort_measured:rows.every(r=>r.human_effort_measured!==false),
    human_s_all:fullSum(rows.map(r=>r.human_s)),repair_rounds:sum(rows.map(r=>r.repair_rounds)),
    critical_defects:rows.filter(r=>r.critical_defect).length};
}

function bootstrapTaskMeans(values,seed=901,samples=5000) {
  if(values.length<2) return null;
  const random=rng(seed), draws=[];
  for(let b=0;b<samples;b++) {
    let total=0; for(let i=0;i<values.length;i++) total+=values[Math.floor(random()*values.length)];
    draws.push(total/values.length);
  }
  draws.sort((a,b)=>a-b);
  return {low:draws[Math.floor(samples*.025)],high:draws[Math.floor(samples*.975)],level:.95,method:'paired task-cluster percentile bootstrap; exploratory'};
}

export function analyze(schedule,records,rates={}) {
  need(schedule?.schema_version===1&&Array.isArray(schedule.runs)&&schedule.runs.length>0,'Invalid schedule');
  const planned=new Map();
  for(const r of schedule.runs) { need(!planned.has(r.run_id),'Duplicate schedule run'); planned.set(r.run_id,r); }
  const seen=new Set(), globalEvents=new Set(), rows=[];
  for(const r of records) {
    need(!seen.has(r.run_id),`Duplicate run ${r.run_id}`); seen.add(r.run_id);
    const p=planned.get(r.run_id); need(p,`Unscheduled run ${r.run_id}`);
    for(const k of ['profile','task','repeat','arm']) need(r[k]===p[k],`Run ${r.run_id}: mismatched ${k}`);
    const m=measureRecord(r,rates);
    for(const u of r.usage) { need(!globalEvents.has(u.event_id),`Usage event reused across runs ${u.event_id}`); globalEvents.add(u.event_id); }
    rows.push(m);
  }
  const missing=[...planned.keys()].filter(id=>!seen.has(id));
  need(missing.length===0,`Missing scheduled records: ${missing.join(', ')}. Record failed/blocked outcomes; do not omit them.`);
  need(new Set(rows.map(r=>r.profile)).size===1,'Do not pool profiles');
  const tasks=[...new Set(rows.map(r=>r.task))].sort(), pairMap=new Map();
  for(const r of rows) {
    const key=`${r.task}:${r.repeat}`; if(!pairMap.has(key)) pairMap.set(key,{});
    need(!pairMap.get(key)[r.arm],`Duplicate pair arm ${key}`); pairMap.get(key)[r.arm]=r;
  }
  const pairs=[...pairMap.values()];
  need(pairs.every(p=>p.native&&p.pi),'Incomplete paired schedule');
  const perTask=Object.fromEntries(tasks.map(task=>{
    const pp=pairs.filter(p=>p.native.task===task);
    return [task,{native:armSummary(pp.map(p=>p.native)),pi:armSummary(pp.map(p=>p.pi)),
      quality_delta_pi_minus_native:mean(pp.map(p=>p.pi.quality-p.native.quality)),
      acceptance_delta_pi_minus_native:mean(pp.map(p=>Number(p.pi.accepted)-Number(p.native.accepted)))}];
  }));
  const arms=Object.fromEntries(ARMS.map(arm=>[arm,armSummary(rows.filter(r=>r.arm===arm))]));
  const both=pairs.filter(p=>p.native.accepted&&p.pi.accepted);
  const taskRows=Object.values(perTask);
  return {profile:rows[0].profile,scheduled_runs:planned.size,distinct_tasks:tasks.length,pairs:pairs.length,
    weighting:'equal tasks for paired deltas; per-run rates and totals for arm summaries',
    arms,per_task:perTask,paired:{
      quality_delta_pi_minus_native:mean(taskRows.map(t=>t.quality_delta_pi_minus_native)),
      quality_delta_interval:bootstrapTaskMeans(taskRows.map(t=>t.quality_delta_pi_minus_native)),
      acceptance_delta_pi_minus_native:mean(taskRows.map(t=>t.acceptance_delta_pi_minus_native)),
      acceptance_delta_interval:bootstrapTaskMeans(taskRows.map(t=>t.acceptance_delta_pi_minus_native)),
      both_accepted_pairs:both.length,
      both_accepted_elapsed_ratio_median_pi_over_native:median(both.map(p=>ratio(p.pi.elapsed_s,p.native.elapsed_s)).filter(v=>v!==null)),
      all_run_tokens_ratio_pi_over_native:ratio(arms.pi.tokens_all,arms.native.tokens_all),
      tokens_per_accepted_ratio_pi_over_native:ratio(arms.pi.tokens_per_accepted,arms.native.tokens_per_accepted),
      estimated_api_usd_per_accepted_ratio_pi_over_native:ratio(arms.pi.estimated_api_usd_per_accepted,arms.native.estimated_api_usd_per_accepted),
    },notes:[
      'No automatic winner. Inspect acceptance, critical defects, quality, cost, review labor, and task-specific differences together.',
      'Positive quality/acceptance delta favors Pi. Ratios below 1 favor Pi for resource use.',
      'Observed token counts are lower bounds when telemetry incomplete. Missing dollars are unknown, not zero.',
      'Token and latency ratios are descriptive point estimates; script does not compute their confidence intervals.',
      'Bootstrap intervals describe this task sample. Few distinct tasks limit broader inference.',
    ]};
}

async function main(args) {
  const [command,a,b,c]=args;
  if(command==='schedule') return makeSchedule(a??'pilot',Number(b??20261112),c??'controlled');
  if(command==='prepare') { need(a&&b,'Usage: prepare TASK DESTINATION'); return prepareTask(a,b); }
  if(command==='records') {
    need(a,'Usage: records SCHEDULE.json');
    return recordTemplates(JSON.parse(await readFile(a,'utf8')));
  }
  if(command==='analyze') {
    need(a&&b,'Usage: analyze SCHEDULE.json RESULTS.jsonl [RATES.json]');
    const [schedule,raw,rates]=await Promise.all([readFile(a,'utf8').then(JSON.parse),readFile(b,'utf8'),c?readFile(c,'utf8').then(JSON.parse):Promise.resolve({})]);
    const records=raw.split(/\r?\n/).filter(s=>s.trim()).map((line,i)=>{
      try{return JSON.parse(line);}catch{throw new Error(`Invalid JSON on results line ${i+1}`);}
    });
    return analyze(schedule,records,rates);
  }
  throw new Error('Commands: schedule [pilot|main] [SEED] [controlled|usual]; records SCHEDULE; prepare TASK DEST; analyze SCHEDULE RESULTS [RATES]. Optional --out FILE.');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const args=process.argv.slice(2), outIndex=args.indexOf('--out'); let outFile;
    if(outIndex>=0) {
      need(outIndex===args.length-2 && args[outIndex+1],'--out must be last argument followed by filename');
      outFile=args[outIndex+1]; args.splice(outIndex,2);
    }
    const result=await main(args), body=(typeof result==='string'?result:JSON.stringify(result,null,2))+'\n';
    if(outFile) { await writeFile(outFile,body,{flag:'wx'}); console.log(`Wrote ${path.resolve(outFile)}`); }
    else console.log(body.trimEnd());
  }
  catch(error) { console.error(error.message); process.exitCode=1; }
}
