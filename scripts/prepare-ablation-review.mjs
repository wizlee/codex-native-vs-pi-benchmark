import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const [output, ...batches] = process.argv.slice(2);
if (!output || !batches.length) throw Error('Usage: prepare-ablation-review OUTPUT_DIRECTORY BATCH...');
fs.mkdirSync(output, { recursive: true });
const artifacts=[], mapping=[], seen=new Map();
let tasks, template;
for (const batch of batches) {
  const schedule=JSON.parse(fs.readFileSync(path.join(batch,'schedule.json')));
  for (const stage of ['first-pass','final']) {
    const args=[fileURLToPath(new URL('./prepare-review.mjs',import.meta.url)),batch,'--observed-only',...(stage==='final'?['--final']:[])];
    template=JSON.parse(execFileSync(process.execPath,args,{encoding:'utf8'}));
    const packet=JSON.parse(fs.readFileSync(path.join(batch,stage==='final'?'blind-review-packet.final.local.json':'blind-review-packet.local.json')));
    tasks=packet.tasks;
    for (const artifact of packet.artifacts) {
      const run=schedule.runs.find(run=>run.blind_id===artifact.blind_id);
      const key=JSON.stringify({task:artifact.task,files:artifact.files,checks:artifact.checks});
      let blind=seen.get(key);
      if(!blind){blind=`review-${String(artifacts.length+1).padStart(3,'0')}`;seen.set(key,blind);artifacts.push({...artifact,blind_id:blind});}
      mapping.push({batch:path.resolve(batch),run_id:run.run_id,stage,blind_id:blind,original_blind_id:run.blind_id});
    }
  }
}
// Deterministic permutation hides collection order without backend labels.
artifacts.sort((a,b)=>a.blind_id.slice(-1).localeCompare(b.blind_id.slice(-1))||b.blind_id.localeCompare(a.blind_id));
const packetPath=path.resolve(output,'blind-review.json');
fs.writeFileSync(packetPath,JSON.stringify({tasks,artifacts},null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(output,'mapping.local.json'),JSON.stringify(mapping,null,2)+'\n',{flag:'wx'});
let prompt=template.prompt.replace(/\d+ anonymized artifacts/,`${artifacts.length} anonymized artifacts`)
  .replace(/all \d+ exactly once/,`all ${artifacts.length} exactly once`)
  .replace(/all \d+ primary artifact bodies/,`all ${artifacts.length} primary artifact bodies`)
  .replace(/Read exactly this frozen anonymous JSON file: .*?\. This is/,`Read exactly this frozen anonymous JSON file: ${packetPath}. This is`);
fs.writeFileSync(path.join(output,'prompt.local.json'),JSON.stringify({title:'Blind ablation artifact review',directoryName:'ablation-blind-review-20261114',prompt},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({artifacts:artifacts.length,mapped_stages:mapping.length}));
