// Installed desktop/Pi telemetry adapter. Reads only explicitly selected sessions.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const hash=s=>createHash('sha256').update(s).digest('hex');
function jsonl(file){return fs.readFileSync(file,'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);}
export function nativeUsage(file,role='root'){
  const es=jsonl(file), meta=es.find(e=>e.type==='session_meta')?.payload;
  if(!meta)throw Error('Missing native session metadata');
  const contexts=es.filter(e=>e.type==='turn_context');
  const records=es.filter(e=>e.type==='token_usage_record');
  const unique=new Map();
  for(const e of records){
    const p=e.payload;
    if(p.thread_id!==meta.id)throw Error('Native usage attributed to another thread');
    if(!p.response_id||!p.usage)throw Error('Missing exclusive response usage');
    if(unique.has(p.response_id))throw Error('Repeated native response ID');
    unique.set(p.response_id,e);
  }
  const ledger=[...unique.values()].map(e=>{
    const u=e.payload.usage;
    if(u.total_tokens!==u.input_tokens+u.output_tokens)throw Error('Native total does not reconcile with inclusive input/output');
    const c=contexts.filter(c=>c.timestamp<=e.timestamp).at(-1)?.payload??contexts[0]?.payload;
    return {event_id:`native:${meta.id}:${e.payload.response_id}`,agent_id:meta.id,role,
      model:`${meta.model_provider??'openai'}/${c?.model??'unknown'}`,source:`${path.basename(file)}:ordinal=${e.ordinal}`,
      scope:'exclusive_call',input_tokens:u.input_tokens,cached_input_tokens:u.cached_input_tokens??null,
      cache_write_tokens:u.cache_write_input_tokens??null,output_tokens:u.output_tokens,
      reasoning_tokens:u.reasoning_output_tokens??null};
  });
  const last=records.at(-1)?.payload.thread_token_usage;
  const reconciled=!!last&&['input_tokens','output_tokens'].every(k=>ledger.reduce((s,u)=>s+u[k],0)===last[k]);
  const finals=es.filter(e=>e.type==='response_item'&&e.payload.type==='message'&&['final','final_answer'].includes(e.payload.phase));
  const text=finals.flatMap(e=>e.payload.content??[]).filter(c=>c.type==='output_text'||c.type==='text').map(c=>c.text).join('\n');
  const errors=es.filter(e=>e.type==='event_msg'&&/error/.test(e.payload?.type??''));
  return {agent_id:meta.id,ledger,reconciled,call_count:ledger.length,source_sha256:hash(fs.readFileSync(file)),
    first_timestamp:es[0].timestamp,last_timestamp:es.at(-1).timestamp,
    contexts:contexts.map(e=>({model:e.payload.model,effort:e.payload.effort})),
    client_version:meta.cli_version,cwd:meta.cwd,final_text:text,error_count:errors.length};
}
export function piUsage(file){
  const es=jsonl(file), session=es.find(e=>e.type==='session');
  const messages=es.filter(e=>e.type==='message'&&e.message?.role==='assistant');
  const id=session?.id??path.basename(file,'.jsonl');
  const ledger=messages.filter(e=>e.message.usage).map(e=>{
    const m=e.message,u=m.usage;
    // Verified in installed pi-ai/openai-responses-shared.js: input excludes cacheRead.
    return {event_id:`pi:${id}:${e.id}`,agent_id:id,role:'worker',model:`${m.provider}/${m.model}`,
      source:`${path.basename(file)}:message=${e.id}`,scope:'exclusive_call',
      input_tokens:u.input+u.cacheRead+u.cacheWrite,cached_input_tokens:u.cacheRead,
      cache_write_tokens:u.cacheWrite,output_tokens:u.output,reasoning_tokens:u.reasoning??null};
  });
  const allUsageKnown=messages.every(e=>e.message.usage&&e.message.usage.totalTokens===
    e.message.usage.input+e.message.usage.cacheRead+e.message.usage.cacheWrite+e.message.usage.output);
  const errors=messages.filter(e=>['error','aborted'].includes(e.message.stopReason));
  return {agent_id:id,ledger,reconciled:allUsageKnown&&ledger.length>0,call_count:ledger.length,
    final_text:messages.filter(e=>e.message.stopReason==='stop').flatMap(e=>e.message.content??[]).filter(c=>c.type==='text').map(c=>c.text).join('\n'),
    contexts:es.filter(e=>e.type==='model_change'||e.type==='thinking_level_change'),
    source_sha256:hash(fs.readFileSync(file)),error_count:errors.length,
    first_timestamp:es[0].timestamp,last_timestamp:es.at(-1).timestamp};
}
export function findNativeFile(id,dayDirectory){
  const directories=[dayDirectory],parts=path.resolve(dayDirectory).split(/[\\/]/),dateParts=parts.slice(-3);
  if(dateParts.every(s=>/^\d+$/.test(s))){
    const [year,month,day]=dateParts.map(Number),sessionRoot=path.dirname(path.dirname(path.dirname(dayDirectory)));
    for(const offset of [-1,1]){const date=new Date(Date.UTC(year,month-1,day+offset));directories.push(path.join(sessionRoot,String(date.getUTCFullYear()),String(date.getUTCMonth()+1).padStart(2,'0'),String(date.getUTCDate()).padStart(2,'0')));}
  }
  const files=directories.filter(d=>fs.existsSync(d)).flatMap(d=>fs.readdirSync(d).filter(f=>f.endsWith('.jsonl')&&f.includes(id)).map(f=>path.join(d,f)));
  if(files.length!==1)throw Error(`Expected exactly one native log for ${id}, found ${files.length}`);
  return files[0];
}
export function collect(spec){
  const root=nativeUsage(findNativeFile(spec.root_id,spec.native_day_directory));
  const workers=(spec.native_worker_ids??[]).map(id=>nativeUsage(findNativeFile(id,spec.native_day_directory),'worker'));
  workers.push(...(spec.pi_session_files??[]).map(piUsage));
  const sources=[root,...workers];
  return {root_id:spec.root_id,usage_complete:sources.every(s=>s.reconciled)&&sources.every(s=>s.error_count===0),
    expected_agent_ids:sources.map(s=>s.agent_id),usage:sources.flatMap(s=>s.ledger),
    sources:sources.map(({ledger,...s})=>s)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const spec=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const result=collect(spec);
    fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({agents:result.expected_agent_ids.length,calls:result.usage.length,
      complete:result.usage_complete,tokens:result.usage.reduce((s,u)=>s+u.input_tokens+u.output_tokens,0)}));
  }catch(e){console.error(e.message);process.exitCode=1;}
}
