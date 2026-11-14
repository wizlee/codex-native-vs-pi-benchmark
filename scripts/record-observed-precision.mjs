import fs from 'node:fs';
import path from 'node:path';
const [batch]=process.argv.slice(2);
if(!batch)throw Error('Usage: record-observed-precision BATCH');
const read=name=>JSON.parse(fs.readFileSync(path.join(batch,name),'utf8'));
for(const stage of ['first-pass','final']){
  const results=read('schedule.json').runs.filter(run=>run.task==='T02').map(run=>{
    const repair=stage==='final'&&fs.existsSync(path.join(batch,`${run.run_id}.repair1.observation.json`));
    const observed=read(`${run.run_id}${repair?'.repair1':''}.observation.json`);
    const check=observed.functional_checks.checks.find(check=>check.name==='predeclared signed integer cancellation precision');
    if(!check)throw Error('Missing retained precision observation');
    return {run_id:run.run_id,input_cents:[Number.MAX_SAFE_INTEGER,2,-Number.MAX_SAFE_INTEGER],expected:check.expected,actual:check.actual,pass:check.pass};
  });
  fs.writeFileSync(path.join(batch,`precision.${stage}.json`),JSON.stringify({scope:'Retained predeclared precision checks, rerunnable against exported artifact snapshots',results},null,2)+'\n',{flag:'wx'});
}
