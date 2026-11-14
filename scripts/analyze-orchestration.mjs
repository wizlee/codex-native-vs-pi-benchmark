// Trace analysis only. Never sends a prompt, starts a worker, or changes bridge settings.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {findNativeFile, nativeUsage, piUsage} from './trial-ledger.mjs';

const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const jsonl=f=>fs.readFileSync(f,'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const sum=xs=>xs.reduce((s,x)=>s+x,0);
const hash=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const callTypes=new Set(['function_call','custom_tool_call']);
const outputTypes=new Set(['function_call_output','custom_tool_call_output']);
const body=p=>p.input??p.arguments??'';
const text=p=>typeof p==='string'?p:Array.isArray(p)?p.map(x=>x.text??'').join('\n'):JSON.stringify(p);
const names=p=>p.name==='exec'?[...body(p).matchAll(/tools\.(\w+)\(/g)].map(m=>m[1]):[p.name];
const workerUsage=u=>({input_tokens:sum(u.ledger.map(c=>c.input_tokens)),cached_input_tokens:sum(u.ledger.map(c=>c.cached_input_tokens)),output_tokens:sum(u.ledger.map(c=>c.output_tokens)),first_input_tokens:u.ledger[0]?.input_tokens});
const isPiStatus=n=>/pi_status$/.test(n);
function category(calls){
  const code=calls.map(body).join('\n'),ns=calls.flatMap(names);
  if(/ALL_TOOLS/.test(code)||ns.some(n=>/pi_discover$|ctx_resume$/.test(n)))return 'setup';
  if(ns.some(n=>/pi_delegate$|^spawn_agent$/.test(n)))return 'launch';
  const coord=ns.some(n=>/pi_status$|pi_wait$|^list_agents$|^wait_agent$|^sleep$|^wait$/.test(n));
  const work=ns.some(n=>/exec_command$|apply_patch$|ctx_execute$/.test(n));
  if(coord)return work?'coordination_with_work':'coordination_only';
  return calls.length?'implementation_and_verification':'final';
}
// Tool outputs can contain JSON MCP content nested inside JSON exec text.
function snapshots(value,found=[]){
  if(typeof value==='string'){
    if(/^[\s]*[\[{]/.test(value)){try{snapshots(JSON.parse(value),found);}catch{}}
  }else if(Array.isArray(value)){value.forEach(v=>snapshots(v,found));}
  else if(value&&typeof value==='object'){
    if(typeof value.state==='string'&&Array.isArray(value.selectedSkills)&&'pendingUiCount' in value)found.push(value);
    else Object.values(value).forEach(v=>snapshots(v,found));
  }
  return found;
}
function waitResults(value,found=[]){
  if(typeof value==='string'){
    if(/^[\s]*[\[{]/.test(value)){try{waitResults(JSON.parse(value),found);}catch{}}
  }else if(Array.isArray(value))value.forEach(v=>waitResults(v,found));
  else if(value&&typeof value==='object'){
    if(typeof value.reason==='string'&&Array.isArray(value.workers))found.push(value);
    else Object.values(value).forEach(v=>waitResults(v,found));
  }
  return found;
}
function errorCode(value){
  if(typeof value==='string'){try{return errorCode(JSON.parse(value));}catch{return null;}}
  if(!value||typeof value!=='object')return null;
  if(typeof value.code==='string'&&/^[A-Z_]+$/.test(value.code))return value.code;
  return Object.values(value).map(errorCode).find(Boolean)??null;
}
export function piCallOutcome(item,wait=false){
  const result=wait?waitResults(item.result)[0]:snapshots(item.result)[0];
  const duration=item.duration?item.duration.secs+item.duration.nanos/1e9:null;
  const common={requested_wait_ms:item.arguments?.waitMs??(wait?60000:10000),duration_s:duration};
  if(!result)return {...common,state:'unavailable',reason:'unavailable_result',error_code:errorCode(item.result),result_available:false,discovery:false,pending_ui:null,snapshot_chars:0,text_chars:0,inventory_skills:0};
  if(wait)return {...common,reason:result.reason,states:result.workers.map(worker=>worker.state),pending_ui:sum(result.workers.map(worker=>worker.pendingUiCount??0)),snapshot_chars:JSON.stringify(result).length,result_available:true};
  return {...common,discovery:Array.isArray(result.skills),state:result.state,snapshot_chars:JSON.stringify(result).length,text_chars:(result.text??'').length,inventory_skills:result.skills?.length??0,pending_ui:result.pendingUiCount,result_available:true};
}
export function rootTrace(events){
  let previous=-1;
  return events.filter(e=>e.type==='token_usage_record').map((e,index)=>{
    const emitted=events.filter(x=>x.ordinal>previous&&x.ordinal<=e.ordinal&&x.type==='response_item'&&callTypes.has(x.payload.type));
    const calls=emitted.map(x=>x.payload),outputs=events.filter(x=>x.type==='response_item'&&outputTypes.has(x.payload.type)&&calls.some(c=>c.call_id===x.payload.call_id));
    const status=calls.flatMap(c=>{
      const outs=outputs.filter(o=>o.payload.call_id===c.call_id),ss=outs.flatMap(o=>snapshots(o.payload.output));
      const elapsed=outs.length?(Date.parse(outs.at(-1).timestamp)-Date.parse(emitted.find(x=>x.payload===c).timestamp))/1000:null;
      return ss.map(s=>({state:s.state,discovery:Array.isArray(s.skills),inventory_skills:s.skills?.length??0,
        snapshot_chars:JSON.stringify(s).length,text_chars:(s.text??'').length,pending_ui:s.pendingUiCount,
        status_call:names(c).some(isPiStatus),wrapper_elapsed_s:elapsed,
        // This is the whole exec wrapper duration, not an individual nested status duration.
        requested_wait_ms:[...body(c).matchAll(/waitMs\s*:\s*(\d+)/g)].map(m=>Number(m[1]))}));
    });
    const usage=e.payload.usage;
    const phase=events.filter(x=>x.ordinal>previous&&x.ordinal<=e.ordinal&&x.type==='response_item'&&x.payload.type==='message'&&x.payload.role==='assistant').at(-1)?.payload.phase;
    previous=e.ordinal;
    return {call:index+1,ordinal:e.ordinal,time:e.timestamp,category:calls.length?category(calls):['final','final_answer'].includes(phase)?'final':'response_without_tool',tools:calls.flatMap(names),
      input_tokens:usage.input_tokens,output_tokens:usage.output_tokens,total_tokens:usage.total_tokens,
      cached_input_tokens:usage.cached_input_tokens,cache_write_tokens:usage.cache_write_input_tokens??0,
      output_chars:sum(outputs.map(o=>text(o.payload.output).length)),snapshots:status};
  });
}
function nativeWorker(file){
  const es=jsonl(file),u=nativeUsage(file,'worker');
  const commands=es.filter(e=>e.type==='event_msg'&&e.payload?.type==='item_completed'&&e.payload.item?.type==='CommandExecution').map(e=>e.payload.item.command.at(-1));
  return {...workerUsage(u),calls:u.call_count,tokens:sum(u.ledger.map(x=>x.input_tokens+x.output_tokens)),start:u.first_timestamp,end:u.last_timestamp,
    span_s:(Date.parse(u.last_timestamp)-Date.parse(u.first_timestamp))/1000,
    command_batches:commands.length,source_read_commands:commands.filter(c=>/Get-Content|ReadAllText|readFile|rg\s/.test(c)).length,
    tool_steps:commands.map(c=>({tool:'shell',skill_read:/SKILL\.md/.test(c),source_read:/summary\.mjs|PROMPT\.md|\.md/.test(c)})),source_sha256:u.source_sha256};
}
function piWorker(file){
  const es=jsonl(file),u=piUsage(file);
  const messages=es.filter(e=>e.type==='message'&&e.message?.role==='assistant');
  const results=es.filter(e=>e.type==='message'&&e.message?.role==='toolResult');
  const injected=es.filter(e=>e.type==='message'&&e.message?.role==='user').flatMap(e=>(e.message.content??[]).filter(c=>c.type==='text').flatMap(c=>[...c.text.matchAll(/<skill name="([^"]+)"/g)].map(m=>m[1])));
  const steps=messages.flatMap(e=>(e.message.content??[]).filter(c=>c.type==='toolCall').map(c=>{
    const file=String(c.arguments?.path??''),result=results.find(e=>e.message.toolCallId===c.id)?.message;
    return {tool:c.name,skill_read:/SKILL\.md/.test(file),source_read:!/SKILL\.md/.test(file),
      file:/SKILL\.md/.test(file)?file.split(/[\\/]/).slice(-2).join('/'):path.basename(file),
      offset:c.arguments?.offset??null,limit:c.arguments?.limit??null,
      compressed_to_search:/ctx_search\(/.test(JSON.stringify(result??{})),error:result?.isError??false};}));
  return {...workerUsage(u),calls:u.call_count,tokens:sum(u.ledger.map(x=>x.input_tokens+x.output_tokens)),start:u.first_timestamp,end:u.last_timestamp,
    span_s:(Date.parse(u.last_timestamp)-Date.parse(u.first_timestamp))/1000,
    command_batches:0,source_read_commands:0,tool_steps:steps,injected_skills:injected,
    reported_tool_duration_s:sum(results.map(e=>e.message.durationMs??0))/1000,
    reread_injected_skill_steps:steps.filter(s=>s.skill_read&&injected.includes(s.file.split('/')[0])).length,
    tools_per_tool_response:messages.filter(e=>e.message.stopReason==='toolUse').map(e=>(e.message.content??[]).filter(c=>c.type==='toolCall').length),source_sha256:u.source_sha256};
}
export function summarize(runs){
  const arms=Object.fromEntries(['native','pi'].map(arm=>{
    const rr=runs.filter(r=>r.arm===arm),calls=rr.flatMap(r=>r.root),workers=rr.flatMap(r=>r.workers);
    const byCategory=Object.fromEntries([...new Set(calls.map(c=>c.category))].sort().map(category=>{
      const cc=calls.filter(c=>c.category===category);return [category,{calls:cc.length,tokens:sum(cc.map(c=>c.total_tokens))}];}));
    const ss=calls.flatMap(c=>c.snapshots),status=ss.filter(s=>s.status_call&&!s.discovery);
    const actualStatus=rr.flatMap(r=>r.pi_status_calls??[]).filter(s=>!s.discovery),active=actualStatus.filter(s=>['starting','running'].includes(s.state)),durations=active.map(s=>s.duration_s).sort((a,b)=>a-b);
    return [arm,{root_calls:calls.length,root_tokens:sum(calls.map(c=>c.total_tokens)),root_input:sum(calls.map(c=>c.input_tokens)),root_output:sum(calls.map(c=>c.output_tokens)),root_cached_input:sum(calls.map(c=>c.cached_input_tokens)),root_output_chars:sum(calls.map(c=>c.output_chars)),
      root_mean_tokens:sum(calls.map(c=>c.total_tokens))/calls.length,by_category:byCategory,
      worker_calls:sum(workers.map(w=>w.calls)),worker_tokens:sum(workers.map(w=>w.tokens)),worker_mean_span_s:sum(workers.map(w=>w.span_s))/workers.length,
      worker_input:sum(workers.map(w=>w.input_tokens)),worker_cached_input:sum(workers.map(w=>w.cached_input_tokens)),worker_output:sum(workers.map(w=>w.output_tokens)),
      worker_mean_first_input:sum(workers.map(w=>w.first_input_tokens))/workers.length,
      pi_reported_tool_duration_s:arm==='pi'?sum(workers.map(w=>w.reported_tool_duration_s)):null,
      worker_tools:workers.flatMap(w=>w.tool_steps).reduce((a,s)=>(a[s.tool]=(a[s.tool]??0)+1,a),{}),
      worker_skill_read_steps:workers.flatMap(w=>w.tool_steps).filter(s=>s.skill_read).length,
      pi_status_snapshots:status.length,pi_status_active:status.filter(s=>['starting','running','waiting_for_user'].includes(s.state)).length,
      pi_status_active_no_text:status.filter(s=>['starting','running'].includes(s.state)&&!s.text_chars).length,
      pi_status_snapshot_chars:sum(status.map(s=>s.snapshot_chars)),
      discovery_inventory_chars:sum(ss.filter(s=>s.discovery).map(s=>s.snapshot_chars)),
      status_wrappers_below_one_second:calls.filter(c=>c.snapshots.some(s=>s.status_call&&!s.discovery&&['starting','running'].includes(s.state))&&c.snapshots.every(s=>s.wrapper_elapsed_s<1)).length,
      native_completion_events:sum(rr.map(r=>r.native_completion_events)),
      exact_status_timing:{active_calls:active.length,below_one_second:durations.filter(n=>n<1).length,median_s:durations.length?durations[Math.floor(durations.length/2)]:null},
      reread_injected_skill_steps:sum(workers.map(w=>w.reread_injected_skill_steps??0)),
      compressed_worker_results:workers.flatMap(w=>w.tool_steps).filter(s=>s.compressed_to_search).length,
      paginated_worker_reads:workers.flatMap(w=>w.tool_steps).filter(s=>s.offset>1).length,
      worker_tool_errors:workers.flatMap(w=>w.tool_steps).filter(s=>s.error).length}];
  }));
  const n=arms.native,p=arms.pi,gap=p.root_tokens-n.root_tokens;
  return {arms,root_token_gap:gap,root_gap_decomposition:{method:'Symmetric arithmetic decomposition of calls × mean inclusive tokens per call; descriptive, not causal attribution',
    extra_rounds:(p.root_calls-n.root_calls)*(p.root_mean_tokens+n.root_mean_tokens)/2,
    larger_average_round:(p.root_mean_tokens-n.root_mean_tokens)*(p.root_calls+n.root_calls)/2},total_token_gap:gap+p.worker_tokens-n.worker_tokens};
}
export function analyzeBatch(batch){
  const schedule=read(path.join(batch,'schedule.json'));
  const runs=schedule.runs.map(r=>{
    const spec=read(path.join(batch,`${r.run_id}.spec.json`)),file=findNativeFile(spec.root_id,spec.native_day_directory),es=jsonl(file);
    const root=rootTrace(es),u=nativeUsage(file);
    if(sum(root.map(c=>c.total_tokens))!==sum(u.ledger.map(c=>c.input_tokens+c.output_tokens)))throw Error('Root usage does not reconcile');
    const nativeCompletions=es.filter(e=>e.type==='event_msg'&&e.payload.type==='item_completed'&&e.payload.item?.type==='SubAgentActivity'&&e.payload.item.kind==='completed');
    const piStatus=es.filter(e=>e.type==='event_msg'&&e.payload.type==='item_completed'&&e.payload.item?.type==='McpToolCall'&&e.payload.item.tool==='pi_status').map(e=>{
      return {root_call:root.filter(c=>c.ordinal<e.ordinal).at(-1)?.call,...piCallOutcome(e.payload.item)};});
    const piWait=es.filter(e=>e.type==='event_msg'&&e.payload.type==='item_completed'&&e.payload.item?.type==='McpToolCall'&&e.payload.item.tool==='pi_wait').map(e=>{
      return piCallOutcome(e.payload.item,true);
    });
    return {run_id:r.run_id,arm:r.arm,task:r.task,repeat:r.repeat,root_source_sha256:hash(file),root,
      native_completion_events:nativeCompletions.length,pi_status_calls:piStatus,pi_wait_calls:piWait,
      workers:r.arm==='native'?spec.native_worker_ids.map(id=>nativeWorker(findNativeFile(id,spec.native_day_directory))):spec.pi_session_files.map(piWorker)};
  });
  return {method:'Selected recorded sessions only. Root totals are exact telemetry. Text sizes are characters, not estimated tokens. Tool-wrapper durations may include multiple operations. Worker spans include startup; they are not CPU times.',...summarize(runs),runs};
}
export function publicTrace(result){
  return {...result,runs:result.runs.map(r=>{
    const baseline=Date.parse(r.root[0].time);
    return {...r,root:r.root.map(({time,...c})=>({...c,seconds_from_first_response:(Date.parse(time)-baseline)/1000})),
      workers:r.workers.map(({start,end,...w})=>({...w,start_from_first_root_response_s:(Date.parse(start)-baseline)/1000,end_from_first_root_response_s:(Date.parse(end)-baseline)/1000}))};})};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  if(process.argv[2]==='--summarize'){
    console.log(JSON.stringify(summarize(read(process.argv[3]).runs),null,2));
    process.exit(0);
  }
  const batch=process.argv[2]??'runs/2026-11-14-matched-workers-pilot';
  const raw=analyzeBatch(batch),result=process.argv.includes('--public')?publicTrace(raw):raw;
  if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({...result,runs:result.runs.map(r=>({run_id:r.run_id,root_calls:r.root.length,worker_calls:sum(r.workers.map(w=>w.calls)),categories:r.root.map(c=>c.category)}))},null,2));
}
