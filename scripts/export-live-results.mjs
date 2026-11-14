import fs from 'node:fs';
import path from 'node:path';
import {analyze} from './benchmark.mjs';
const source=process.argv[2]??'runs/2026-11-13-fair-read-pilot';
const destination=process.argv[3]??'results/2026-11-13-fair-read-pilot';
fs.mkdirSync(destination,{recursive:true});
const read=name=>JSON.parse(fs.readFileSync(path.join(source,name),'utf8'));
const write=(name,value)=>fs.writeFileSync(path.join(destination,name),JSON.stringify(value,null,2)+'\n');
const schedule=read('schedule.json'),rates=read('rates.json');
const originalRecords=fs.readFileSync(path.join(source,'results.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const sourceManifest=read('manifest.json');
const unique=values=>[...new Set(values)].join('/');
const actualRootEffort=unique(originalRecords.flatMap(r=>r.diagnostics.actual_configuration.root.reasoning));
const actualWorkerEffort=arm=>unique(originalRecords.filter(r=>r.arm===arm).flatMap(r=>r.diagnostics.actual_configuration.workers.flatMap(w=>w.reasoning)));
const records=originalRecords.map(r=>{
  const aliases=new Map(r.expected_agent_ids.map((id,i)=>[id,`${r.run_id}:${i===0?'root':`worker-${i}`}`]));
  const diagnostics={...r.diagnostics};delete diagnostics.review_evidence;
  diagnostics.profile_scope=sourceManifest.matched_workers?'Log-validated matching worker model/effort and fixed reviewer skill scopes; host harness differences remain.':'Equivalent semantic read access; default model reasoning and root-selected extra skills not matched.';
  return {...r,diagnostics,expected_agent_ids:[...aliases.values()],usage:r.usage.map((u,i)=>({...u,
    event_id:`${r.run_id}:call-${i+1}`,agent_id:aliases.get(u.agent_id),source:`anonymized local source, call ${i+1}`}))};
});
fs.writeFileSync(path.join(destination,'results.jsonl'),records.map(JSON.stringify).join('\n')+'\n');
write('schedule.json',schedule);write('rates.json',rates);
write('comparison.json',analyze(schedule,records,rates));
for(const name of ['scores.first-pass.json','scores.final.json','precision.first-pass.json','precision.final.json','scope-audit.json','fresh-context-audit.json'])write(name,read(name));
for(const name of ['delivery-copy-audit.json','reviewer-skills-audit.json','review-input-validation.json'])if(fs.existsSync(path.join(source,name)))write(name,read(name));
for(const r of schedule.runs){const file=path.join(source,`${r.run_id}.configuration.json`);if(fs.existsSync(file)){fs.mkdirSync(path.join(destination,'configurations'),{recursive:true});write(`configurations/${r.run_id}.json`,JSON.parse(fs.readFileSync(file,'utf8')));}}
const details=read('details.json').map(({reviewer,...r})=>r);
write('details.json',details);
for(const r of schedule.runs){
  for(const stage of ['final','first-pass']){
    const repaired=fs.existsSync(path.join(source,'artifacts',`${r.blind_id}.repair1.json`));
    if(stage==='first-pass'&&!repaired)continue;
    const tag=stage==='final'&&repaired?'.repair1':'';
    const artifact=read(`artifacts/${r.blind_id}${tag}.json`);
    const directory=path.join(destination,'artifacts',r.run_id,stage);fs.mkdirSync(directory,{recursive:true});
    for(const [name,body] of Object.entries(artifact.files)){
      if(!['summary.mjs','summary.test.mjs','DECISION.md','SOURCES.md','PROMPT.md','KEEP.txt','package.json'].includes(name))continue;
      if(/C:[/\\]+Users[/\\]|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(body))throw Error(`Private path/session ID in primary artifact ${name}`);
      fs.writeFileSync(path.join(directory,name),body);
    }
  }
}
fs.copyFileSync(path.join(source,'RESULTS.md'),path.join(destination,'RESULTS.md'));
write('manifest.json',{
  batch:path.basename(source),local_dates:sourceManifest.matched_workers?'2026-11-14':'2026-11-13 through 2026-11-14',timezone:'Asia/Kuala_Lumpur',
  trials:8,task_types:2,repetitions_per_task_arm:2,ordering_seed:20261112,
  fresh_root_sessions:true,root_history_forked:false,workers_per_trial:2,
  root_model:'gpt-6.1-sol',root_reasoning:actualRootEffort,native_worker_reasoning:actualWorkerEffort('native'),pi_worker_reasoning:actualWorkerEffort('pi'),
  configuration_source:'Actual per-session source contexts, not config defaults or self-reports',
  configuration_correction:sourceManifest.configuration_correction??null,
  matched_workers:sourceManifest.matched_workers??false,
  read_policy:'Equivalent semantic read access; native read-only shell and Pi read/grep/find/ls. Root alone edits and executes tests.',
  skills:sourceManifest.matched_workers?sourceManifest.worker_skills:'Shared caveman/unslop required; roots selected additional role skills. Pi T02 handoffs included execution-dependent diagnose and readers reported blocked.',
  quality:'Independent fresh-session AI review with backend/time/cost labels withheld; same configured model family. No human review measured.',
  timing:'Sum initial and allowed repair work segments. Study queue, calibration, orchestration, and AI judging excluded.',
  telemetry:'Exclusive per-call root and worker usage; cached/reasoning subsets counted once; all ledgers reconcile.',
  exclusions:sourceManifest.matched_workers?'Prior diagnostic/default-configuration studies kept separate; no pooling or backend/model fallback.':'Four earlier no-shell diagnostic runs excluded after methodology flaw. One diagnostic hit account usage limit; subsequent recovery retained locally.',
  privacy:'Chat/session IDs and local paths omitted. Primary synthetic artifacts unchanged; local orchestration metadata and supplementary proof files omitted.',
});
console.log(JSON.stringify({destination,trials:records.length,native_tokens:records.filter(r=>r.arm==='native').flatMap(r=>r.usage).reduce((s,u)=>s+u.input_tokens+u.output_tokens,0),pi_tokens:records.filter(r=>r.arm==='pi').flatMap(r=>r.usage).reduce((s,u)=>s+u.input_tokens+u.output_tokens,0)}));
