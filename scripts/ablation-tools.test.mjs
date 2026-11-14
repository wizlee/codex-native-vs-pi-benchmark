import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { taskFiles } from './cases.mjs';
const script=name=>fileURLToPath(new URL(name,import.meta.url));
const run=(name,args)=>JSON.parse(execFileSync(process.execPath,[script(name),...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
function directory(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'ablation-tool-'));
  t.after(()=>{assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(root,{recursive:true,force:true});});
  return root;
}
const write=(root,name,data)=>{fs.mkdirSync(path.dirname(path.join(root,name)),{recursive:true});fs.writeFileSync(path.join(root,name),JSON.stringify(data));};
test('ablation preparation freezes balanced fresh-session packets and refuses overwrite',t=>{
  const root=directory(t),bridge=path.join(root,'bridge'),output=path.join(root,'batch');
  for(const name of ['bridge','server','rpc','worker-prompt','request-shape'])write(bridge,`src/${name}.mjs`,{});
  const result=run('./prepare-ablation.mjs',[output,'controller',bridge]);
  assert.equal(result.trials,4);
  const packets=result.order.map(id=>JSON.parse(fs.readFileSync(path.join(output,`${id}.packet.json`))));
  assert.deepEqual(packets.map(p=>p.run.arm),['pi','native','native','pi']);
  for(const p of packets){assert.match(p.prompt,/gpt-6.1-sol\/high/);assert.match(p.prompt,/Root must keep its configured model\/reasoning/);assert.match(p.prompt,/CONTROLLER WAIT CONTRACT/);}
  const before=fs.readFileSync(path.join(output,'schedule.json'));
  assert.throws(()=>run('./prepare-ablation.mjs',[output,'controller',bridge]));
  assert.ok(before.equals(fs.readFileSync(path.join(output,'schedule.json'))));
  const corrected=path.join(root,'corrected');
  const next=run('./prepare-ablation.mjs',[corrected,'corrected',bridge]);
  assert.deepEqual(next.order.map(id=>id.split('-').at(-1)),['native','pi','pi','native']);
  for(const id of next.order){const packet=JSON.parse(fs.readFileSync(path.join(corrected,`${id}.packet.json`)));assert.ok(packet.directoryName.startsWith('corrected-ablation-'));assert.ok(!packets.some(previous=>previous.directoryName===packet.directoryName));}
});
test('blind review deduplicates identical stages, maps scores, rejects incomplete review',t=>{
  const root=directory(t),batch=path.join(root,'batch'),review=path.join(root,'review');
  const planned={run_id:'controlled-T02-r1-pi',task:'T02',arm:'pi',blind_id:'artifact-001'};
  write(batch,'schedule.json',{runs:[planned]});
  write(batch,`${planned.run_id}.observation.json`,{cwd:'X:/private-trial'});
  write(batch,'artifacts/artifact-001.json',{files:taskFiles('T02'),answer:'complete',checks:{pass:false}});
  const result=run('./prepare-ablation-review.mjs',[review,batch]);
  assert.equal(result.artifacts,1);assert.equal(result.mapped_stages,2);
  const packet=JSON.parse(fs.readFileSync(path.join(review,'blind-review.json')));
  assert.equal(packet.artifacts[0].blind_id,'review-001');
  const prompt=JSON.parse(fs.readFileSync(path.join(review,'prompt.local.json'))).prompt;
  assert.match(prompt,/all 1 exactly once/);assert.ok(prompt.includes(path.join(review,'blind-review.json')));
  write(root,'bad-scores.json',{artifacts:[]});
  assert.throws(()=>run('./split-ablation-scores.mjs',[review,path.join(root,'bad-scores.json')]));
  write(root,'scores.json',{artifacts:[{blind_id:'review-001',mandatory_pass:false}]});
  assert.equal(run('./split-ablation-scores.mjs',[review,path.join(root,'scores.json')]).files,2);
  assert.equal(JSON.parse(fs.readFileSync(path.join(batch,'scores.final.json'))).artifacts[0].blind_id,'artifact-001');
});
test('live report keeps incomplete costs unknown and rejects a failed worker workflow',t=>{
  const root=directory(t),batch=path.join(root,'batch');
  const runs=['native','pi'].map((arm,index)=>({run_id:`controlled-T02-r1-${arm}`,profile:'controlled',task:'T02',repeat:1,arm,order:index+1,pair_id:'controlled-T02-r1',blind_id:`artifact-${index+1}`}));
  write(batch,'schedule.json',{schema_version:1,runs});write(batch,'manifest.json',{matched_workers:true});
  write(batch,'rates.json',{snapshot_date:'2026-11-13',source:'fixture',models:{'openai/gpt-6.1-sol':{input_per_million:2,cached_input_per_million:0.1,cache_write_per_million:2.5,output_per_million:10}}});
  const review={artifacts:runs.map(run=>({blind_id:run.blind_id,mandatory_pass:true,critical_defect:false,scores:{correctness:4,verification:4,simplicity:4,research:4,instructions:4},evidence:['fixture']}))};
  write(batch,'scores.first-pass.json',review);write(batch,'scores.final.json',review);
  write(batch,'worker-completion-audit.json',runs.map(run=>({run_id:run.run_id,workflow_fully_complete:run.arm!=='pi'})));
  for(const run of runs){
    const ids=[`${run.arm}-root`,`${run.arm}-worker1`,`${run.arm}-worker2`];
    write(batch,`${run.run_id}.observation.json`,{functional_checks:{functional_checks_pass:true},workers_with_model_calls:2,delivery_s:1,root_reported_blocked:false,total_tokens:330,configuration:{pass:true}});
    write(batch,`${run.run_id}.usage.json`,{usage_complete:run.arm!=='pi',expected_agent_ids:ids,
      sources:ids.map((agent_id,index)=>({agent_id,contexts:[{effort:index===0?'low':'high'}]})),
      usage:ids.map((agent_id,index)=>({agent_id,event_id:`${agent_id}:call`,model:'openai/gpt-6.1-sol',source:'fixture',role:index===0?'root':'worker',scope:'exclusive_call',input_tokens:100,cached_input_tokens:50,cache_write_tokens:0,output_tokens:10,reasoning_tokens:0}))});
  }
  run('./build-live-report.mjs',[path.join(batch,'scores.final.json'),batch]);
  const details=JSON.parse(fs.readFileSync(path.join(batch,'details.json')));
  assert.equal(details.find(row=>row.arm==='pi').standard_api_equivalent_usd,null);
  assert.equal(details.find(row=>row.arm==='pi').workflow_fully_complete,false);
  assert.equal(details.find(row=>row.arm==='pi').success,false);
  const report=fs.readFileSync(path.join(batch,'RESULTS.md'),'utf8');
  assert.match(report,/Full resource comparison is unknown/);assert.ok(!report.includes('NaN'));
});
