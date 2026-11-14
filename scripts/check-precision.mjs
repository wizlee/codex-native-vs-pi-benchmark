// Independent reviewer edge case in the original pilot; predeclared in matched-worker trials.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const batch=process.argv[2]??'runs/2026-11-13-fair-read-pilot';
const schedule=JSON.parse(fs.readFileSync(path.join(batch,'schedule.json'),'utf8'));
const results=[];
for(const r of schedule.runs.filter(r=>r.task==='T02')){
  let implementation;
  if(process.argv.includes('--public')){
    const first=path.join(batch,'artifacts',r.run_id,'first-pass','summary.mjs');
    implementation=process.argv.includes('--first-pass')&&fs.existsSync(first)?first:path.join(batch,'artifacts',r.run_id,'final','summary.mjs');
  }else{
    const o=JSON.parse(fs.readFileSync(path.join(batch,`${r.run_id}.observation.json`),'utf8'));
    implementation=path.join(o.cwd,'summary.mjs');
  }
  const {summarize}=await import(pathToFileURL(path.resolve(implementation)).href+`?precision=${Date.now()}`);
  const cents=[Number.MAX_SAFE_INTEGER,2,-Number.MAX_SAFE_INTEGER];
  const events=cents.map((cents,i)=>({id:String(i),customer:'x',sequence:0,cents,state:'posted'}));
  const actual=summarize(events),expected=[{customer:'x',cents:2,count:3}];
  results.push({run_id:r.run_id,input_cents:cents,expected,actual,pass:JSON.stringify(actual)===JSON.stringify(expected)});
}
const manifestPath=path.join(batch,'manifest.json');
const matched=fs.existsSync(manifestPath)&&JSON.parse(fs.readFileSync(manifestPath,'utf8')).matched_workers;
console.log(JSON.stringify({scope:matched?'Predeclared precision cancellation check; final mathematical total is safe integer':'Independent post-submission review edge case; final mathematical total is safe integer',results},null,2));
