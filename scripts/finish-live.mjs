import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {collect,verifyConfiguration} from './trial-ledger.mjs';
import {pathToFileURL} from 'node:url';
import {checkTask} from './check.mjs';
import {taskFiles} from './cases.mjs';

const [runId,stateFile,batchDirectory='runs/2026-11-13-pilot',version='']=process.argv.slice(2);
const tag=version?`.${version}`:'';
const base=path.resolve(batchDirectory);
const launches=JSON.parse(fs.readFileSync(path.join(base,'launches.json'),'utf8'));
const run=launches.find(r=>r.run_id===runId);
if(!run)throw Error('Unknown launch');
const state=JSON.parse(fs.readFileSync(stateFile,'utf8'));
if(state.thread.id!==run.threadId||state.thread.status.type!=='idle')throw Error('Root not finished or mismatched');
const cwd=state.thread.cwd,turn=state.turns[0],turns=state.turns;
const dateParts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(state.thread.createdAt*1000));
const datePart=k=>dateParts.find(p=>p.type===k).value;
const spec={root_id:run.threadId,native_day_directory:path.join(os.homedir(),'.codex','sessions',datePart('year'),datePart('month'),datePart('day'))};
const workerIds=[...new Set(turns.flatMap(t=>t.items).filter(i=>i.type==='subAgentActivity'&&i.kind==='started').map(i=>i.agentThreadId))];
let metadata={};
const metaPath=path.join(cwd,'outputs','RUN_METADATA.json');
if(fs.existsSync(metaPath))metadata=JSON.parse(fs.readFileSync(metaPath,'utf8'));
if(run.arm==='native')spec.native_worker_ids=workerIds;
else{
  const text=JSON.stringify(metadata),ids=[...new Set(text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)??[])];
  const directory=path.join(os.homedir(),'.codex','pi-bridge','sessions');
  const names=fs.readdirSync(directory);
  spec.pi_session_files=ids.flatMap(id=>names.filter(n=>n.endsWith('.jsonl')&&n.includes(id)).map(n=>path.join(directory,n)))
    .filter(file=>fs.readFileSync(file,'utf8').split('\n').filter(Boolean).map(JSON.parse).some(e=>e.type==='message'&&e.message?.role==='assistant'));
}
const usage=collect(spec);
const manifestPath=path.join(base,'manifest.json');
const manifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):{};
let configuration=null;
if(manifest.matched_workers){
  configuration=verifyConfiguration(usage,{root_model:manifest.root_model,root_reasoning:manifest.root_reasoning,worker_model:manifest.worker_model,worker_reasoning:manifest.native_worker_reasoning});
  fs.writeFileSync(path.join(base,`${runId}${tag}.configuration.json`),JSON.stringify(configuration,null,2)+'\n',{flag:'wx'});
}
const checker=await checkTask(run.task,cwd);
if(run.task==='T02'&&manifest.precision_case_predeclared){
  const {summarize}=await import(pathToFileURL(path.join(cwd,'summary.mjs')).href);
  const input=[Number.MAX_SAFE_INTEGER,2,-Number.MAX_SAFE_INTEGER].map((cents,i)=>({id:String(i),customer:'x',sequence:0,cents,state:'posted'}));
  const actual=summarize(input),expected=[{customer:'x',cents:2,count:3}];
  const pass=JSON.stringify(actual)===JSON.stringify(expected);
  checker.checks.push({name:'predeclared signed integer cancellation precision',pass,actual,expected});
  checker.functional_checks_pass&&=pass;
}
const fixtures=taskFiles(run.task),artifactFiles={};
const names=[];
function visit(relative=''){
  for(const entry of fs.readdirSync(path.join(cwd,relative),{withFileTypes:true})){
    const name=path.posix.join(relative,entry.name);
    if(entry.isDirectory()&&!['outputs','node_modules','.git'].includes(entry.name))visit(name);
    else if(entry.isFile()&&(Object.hasOwn(fixtures,name)||/\.(mjs|js)$/.test(name)||['DECISION.md','REVIEW.md','PLAN.md'].includes(name)))names.push(name);
  }
}
visit();
const outputDirectory=path.join(cwd,'outputs');
if(fs.existsSync(outputDirectory))for(const entry of fs.readdirSync(outputDirectory,{withFileTypes:true})){
  if(entry.isFile()&&/\.(mjs|js)$/.test(entry.name))names.push(`outputs/${entry.name}`);
}
for(const name of names)if(fs.statSync(path.join(cwd,name)).isFile())artifactFiles[name]=fs.readFileSync(path.join(cwd,name),'utf8');
const final=turn.items.filter(i=>i.type==='agentMessage'&&i.phase==='final_answer').map(i=>i.text).join('\n');
const artifact={blind_id:run.blind_id,task:run.task,files:artifactFiles,
  answer:final.replace(/\b(?:Pi|Codex|native)\b/gi,'[backend]').replace(/[A-Z]:[\\/][^\s)\]]+/g,'[local-path]'),checks:checker};
const destination=path.join(base,'artifacts');fs.mkdirSync(destination,{recursive:true});
fs.writeFileSync(path.join(destination,`${run.blind_id}${tag}.json`),JSON.stringify(artifact,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(base,`${runId}${tag}.spec.json`),JSON.stringify(spec,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(base,`${runId}${tag}.usage.json`),JSON.stringify(usage,null,2)+'\n',{flag:'wx'});
const observed={...run,cwd,delivery_s:turns.reduce((s,t)=>s+(t.durationMs??0),0)/1000,started_at:Math.min(...turns.map(t=>t.startedAt)),completed_at:turn.completedAt,
  root_reported_blocked:final.includes('RUN_BLOCKED'),root_reported_complete:final.includes('RUN_COMPLETE'),
  status_history:turns.map(t=>({status:t.status,started_at:t.startedAt,completed_at:t.completedAt,error:t.error})),
  configuration,
  workers_with_model_calls:usage.expected_agent_ids.length-1,usage_complete:usage.usage_complete,
  total_tokens:usage.usage.reduce((s,u)=>s+u.input_tokens+u.output_tokens,0),
  input_tokens:usage.usage.reduce((s,u)=>s+u.input_tokens,0),
  cached_input_tokens:usage.usage.reduce((s,u)=>s+(u.cached_input_tokens??0),0),
  output_tokens:usage.usage.reduce((s,u)=>s+u.output_tokens,0),
  own_tests:Object.keys(artifactFiles).filter(n=>!Object.hasOwn(fixtures,n)),
  functional_checks:checker,metadata,
  hashes:Object.fromEntries(Object.entries(artifactFiles).map(([n,s])=>[n,createHash('sha256').update(s).digest('hex')]))};
fs.writeFileSync(path.join(base,`${runId}${tag}.observation.json`),JSON.stringify(observed,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({run:runId,delivery_s:observed.delivery_s,workers:observed.workers_with_model_calls,
  complete:usage.usage_complete,tokens:observed.total_tokens,checks:checker.functional_checks_pass,configuration_pass:configuration?.pass??null,files:Object.keys(artifactFiles)}));
