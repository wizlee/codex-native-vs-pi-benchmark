import fs from 'node:fs';
import path from 'node:path';
const [source,destination]=process.argv.slice(2);
if(!source||!destination)throw Error('Usage: export-ablation-observations SOURCE_BATCH DESTINATION');
const read=name=>JSON.parse(fs.readFileSync(path.join(source,name),'utf8'));
const write=(file,body)=>{
  if(fs.existsSync(file)){if(fs.readFileSync(file,'utf8')!==body)throw Error(`Refusing to replace changed export ${path.basename(file)}`);return;}
  fs.writeFileSync(file,body,{flag:'wx'});
};
const schedule=read('schedule.json'),completion=read('worker-completion-audit.json');
const observations=schedule.runs.filter(run=>fs.existsSync(path.join(source,`${run.run_id}.observation.json`))).map(run=>{
  const observed=read(`${run.run_id}.observation.json`),collection=read(`${run.run_id}.usage.json`);
  const aliases=new Map(collection.expected_agent_ids.map((id,index)=>[id,`${run.run_id}:${index===0?'root':`worker-${index}`}`]));
  return {run_id:run.run_id,task:run.task,arm:run.arm,agent_work_s:observed.delivery_s,
    functional_checks:observed.functional_checks,workflow:completion.find(row=>row.run_id===run.run_id),
    configuration:observed.configuration,usage_complete:collection.usage_complete,
    observed_tokens_lower_bound:collection.usage.reduce((sum,call)=>sum+call.input_tokens+call.output_tokens,0),
    quality_review:'Not independently scored; no accepted-outcome cost claim.',
    usage:collection.usage.map((call,index)=>({...call,agent_id:aliases.get(call.agent_id),event_id:`${run.run_id}:call-${index+1}`,source:`anonymized selected source, call ${index+1}`})),
    error_counts:collection.sources.map((record,index)=>({agent:index===0?'root':`worker-${index}`,error_count:record.error_count,reconciled:record.reconciled}))};
});
const output={scope:'All completed observations from a stopped phase. Original plan retained. Missing trials were never started; failed observations are not discarded. Failed zero-usage records do not prove zero billing.',
  planned:schedule.runs.length,observed:observations.length,unexecuted:schedule.runs.filter(run=>!observations.some(row=>row.run_id===run.run_id)).map(run=>run.run_id),observations};
fs.mkdirSync(destination,{recursive:true});
for(const name of ['manifest.json','schedule.json','source-inspection.json','source-fingerprints.json','worker-completion-audit.json','cache.json'])if(fs.existsSync(path.join(source,name)))write(path.join(destination,name),JSON.stringify(read(name),null,2)+'\n');
write(path.join(destination,'observations.json'),JSON.stringify(output,null,2)+'\n');
for(const run of schedule.runs.filter(run=>observations.some(row=>row.run_id===run.run_id))){
  const artifact=read(`artifacts/${run.blind_id}.json`);
  const target=path.join(destination,'artifacts',run.run_id,'first-pass');fs.mkdirSync(target,{recursive:true});
  for(const [name,body] of Object.entries(artifact.files)){
    if(!['summary.mjs','summary.test.mjs','PROMPT.md','KEEP.txt','package.json'].includes(name))continue;
    if(/[A-Z]:[\\/]+Users[\\/]|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(body))throw Error('Private identity in primary artifact');
    write(path.join(target,name),body);
  }
}
console.log(JSON.stringify({planned:output.planned,observed:output.observed,unexecuted:output.unexecuted}));
