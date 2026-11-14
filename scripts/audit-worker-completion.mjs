import fs from 'node:fs';
import path from 'node:path';
import { findNativeFile, piUsage } from './trial-ledger.mjs';
const [batch]=process.argv.slice(2);
if(!batch)throw Error('Usage: audit-worker-completion BATCH');
const read=name=>JSON.parse(fs.readFileSync(path.join(batch,name),'utf8'));
const jsonl=file=>fs.readFileSync(file,'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const planned=read('schedule.json').runs;
const selected=process.argv.includes('--observed-only')?planned.filter(run=>fs.existsSync(path.join(batch,`${run.run_id}.spec.json`))):planned;
const outcomes=selected.map(run=>{
  const spec=read(`${run.run_id}.spec.json`),events=jsonl(findNativeFile(spec.root_id,spec.native_day_directory));
  const states=new Map();
  let unknown=false;
  const visit=value=>{
    if(typeof value==='string'){try{visit(JSON.parse(value));}catch{}return;}
    if(Array.isArray(value)){value.forEach(visit);return;}
    if(!value||typeof value!=='object')return;
    if(value.code==='UNKNOWN_WORKER')unknown=true;
    if(typeof value.id==='string'&&typeof value.state==='string')states.set(value.id,value.state);
    Object.values(value).forEach(visit);
  };
  for(const event of events){
    const item=event.type==='event_msg'&&event.payload.type==='item_completed'?event.payload.item:null;
    if(item?.type==='McpToolCall'&&['pi_delegate','pi_status','pi_wait'].includes(item.tool)){
      unknown=false;visit(item.result);
      if(unknown)for(const id of item.arguments?.ids??(item.arguments?.id?[item.arguments.id]:[]))states.set(id,'lost_after_interruption');
    }
    if(item?.type==='SubAgentActivity'&&item.kind==='completed')states.set(item.agent_thread_id,'completed');
  }
  const ids=run.arm==='pi'?spec.pi_session_files.map(file=>piUsage(file).agent_id):spec.native_worker_ids;
  const workers=ids.map((id,index)=>({worker:index+1,state:states.get(id)??'unobserved'}));
  return {run_id:run.run_id,workers,workflow_fully_complete:workers.length===2&&workers.every(worker=>worker.state==='completed')};
});
fs.writeFileSync(path.join(batch,'worker-completion-audit.json'),JSON.stringify(outcomes,null,2)+'\n');
console.log(JSON.stringify(outcomes));
