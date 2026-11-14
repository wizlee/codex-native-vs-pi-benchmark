import fs from 'node:fs';
import path from 'node:path';
const [reviewDirectory, scoreFile] = process.argv.slice(2);
if (!reviewDirectory || !scoreFile) throw Error('Usage: split-ablation-scores REVIEW_DIRECTORY SCORES_JSON');
const mapping=JSON.parse(fs.readFileSync(path.join(reviewDirectory,'mapping.local.json')));
const scores=JSON.parse(fs.readFileSync(scoreFile));
const byId=new Map();
for(const artifact of scores.artifacts){
  if(byId.has(artifact.blind_id))throw Error('Duplicate review identity');
  byId.set(artifact.blind_id,artifact);
}
const expected=new Set(mapping.map(entry=>entry.blind_id));
if(byId.size!==expected.size||[...expected].some(id=>!byId.has(id)))throw Error('Review coverage mismatch');
const destinations=new Map();
for(const entry of mapping){
  const destination=path.join(entry.batch,entry.stage==='final'?'scores.final.json':'scores.first-pass.json');
  const artifacts=destinations.get(destination)??[];
  artifacts.push({...byId.get(entry.blind_id),blind_id:entry.original_blind_id});
  destinations.set(destination,artifacts);
}
for(const [destination,artifacts] of destinations)fs.writeFileSync(destination,JSON.stringify({artifacts,review_limits:scores.review_limits??[]},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({files:destinations.size,reviewed_artifacts:byId.size}));
