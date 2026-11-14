import fs from 'node:fs';
import path from 'node:path';
import {findNativeFile} from './trial-ledger.mjs';
const batch=process.argv[2];
const plan=JSON.parse(fs.readFileSync(path.join(batch,'schedule.json'),'utf8'));
const jsonl=f=>fs.readFileSync(f,'utf8').trim().split('\n').map(JSON.parse);
const scope=[],fresh=[],copies=[],skillAudit=[];
const manifest=JSON.parse(fs.readFileSync(path.join(batch,'manifest.json'),'utf8'));
const skillsFrom=text=>[...String(text).matchAll(/[\\/]([^\\/'"\s]+)[\\/]SKILL\.md/g)].map(m=>m[1]);
for(const r of plan.runs){
  const spec=JSON.parse(fs.readFileSync(path.join(batch,`${r.run_id}.spec.json`),'utf8'));
  const root=jsonl(findNativeFile(spec.root_id,spec.native_day_directory));
  const meta=root.find(e=>e.type==='session_meta').payload;
  const resumes=[];
  for(const e of root.filter(e=>e.type==='response_item')){
    const text=JSON.stringify(e.payload),i=text.indexOf('<context_mode_state');
    if(i>=0){const section=text.slice(i,i+1000),id=section.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];resumes.push({session_matches:id===spec.root_id});}
  }
  fresh.push({run_id:r.run_id,root_fork_parent_present:!!(meta.forked_from_id||meta.parent_thread_id),resumed_states:resumes});
  let commands=0,fileChanges=0;const flagged=[],piTools=new Set(),observedSkills=[];let blocked=0;
  for(const id of spec.native_worker_ids??[]){const skillNames=new Set();for(const e of jsonl(findNativeFile(id,spec.native_day_directory))){
    if(e.type!=='event_msg'||e.payload.type!=='item_completed')continue;
    const item=e.payload.item;
    if(item?.type==='FileChange')fileChanges++;
    if(item?.type==='CommandExecution'){
      commands++;const code=item.command.at(-1);
      for(const name of skillsFrom(code))skillNames.add(name);
      const literalByteInspection=/^\[Convert\]::ToHexString\(\[System\.IO\.File\]::ReadAllBytes\('[^']*'\)\)\s*$/.test(code.trim());
      if((!literalByteInspection&&!/^(Get-Content|Get-ChildItem|Get-Location|Get-Item|Get-FileHash|Format-Hex|Select-String|rg\b|\[.*ReadAllText)/.test(code.trim()))||/\b(Set-Content|WriteAll|Remove-Item|node|python|npm|apply_patch)\b/i.test(code))flagged.push(code);
    }
  }observedSkills.push([...skillNames].sort());}
  for(const file of spec.pi_session_files??[]){
    const messages=jsonl(file).filter(e=>e.type==='message'&&e.message?.role==='assistant');
    const skillNames=new Set();
    for(const e of jsonl(file).filter(e=>e.type==='message'))for(const c of e.message.content??[]){
      if(c.type==='toolCall')for(const name of skillsFrom(c.arguments?.path??''))skillNames.add(name);
      if(c.type==='text')for(const m of c.text.matchAll(/<skill\s+name=["']([^"']+)["']/g))skillNames.add(m[1]);
    }
    observedSkills.push([...skillNames].sort());
    for(const e of messages)for(const c of e.message.content??[])if(c.type==='toolCall')piTools.add(c.name);
    const finals=messages.filter(e=>e.message.stopReason==='stop').flatMap(e=>e.message.content??[]).filter(c=>c.type==='text').map(c=>c.text).join('\n');
    if(/blocked/i.test(finals))blocked++;
  }
  scope.push({run_id:r.run_id,native_read_commands:commands,native_commands_needing_manual_review:flagged,native_file_changes:fileChanges,pi_tool_names:[...piTools],pi_workers_reporting_blocked:blocked});
  const expected=manifest.worker_skills?.[r.task]?[...manifest.worker_skills[r.task]].sort():null;
  skillAudit.push({run_id:r.run_id,expected,observed:observedSkills,match:expected?observedSkills.length===2&&observedSkills.every(a=>JSON.stringify(a)===JSON.stringify(expected)):null});
  const o=JSON.parse(fs.readFileSync(path.join(batch,`${r.run_id}.observation.json`),'utf8'));
  const name=r.task==='T02'?'summary.mjs':'DECISION.md',out=path.join(o.cwd,'outputs',name);
  copies.push({run_id:r.run_id,delivered_copy_present:fs.existsSync(out),matches_working_artifact:fs.existsSync(out)?fs.readFileSync(path.join(o.cwd,name)).equals(fs.readFileSync(out)):null});
}
for(const [name,data] of Object.entries({'scope-audit.json':scope,'fresh-context-audit.json':fresh,'delivery-copy-audit.json':copies,'reviewer-skills-audit.json':skillAudit}))fs.writeFileSync(path.join(batch,name),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({trials:scope.length,flagged_commands:scope.flatMap(s=>s.native_commands_needing_manual_review),worker_file_changes:scope.reduce((s,r)=>s+r.native_file_changes,0),blocked_pi_readers:scope.reduce((s,r)=>s+r.pi_workers_reporting_blocked,0),cross_session_resume:fresh.some(s=>s.resumed_states.some(r=>!r.session_matches)),delivery_mismatches:copies.filter(c=>c.matches_working_artifact===false)}));
