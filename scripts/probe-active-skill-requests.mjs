// Read only the explicitly selected root and its selected Pi workers.
import fs from 'node:fs';
import path from 'node:path';
import { findNativeFile } from './trial-ledger.mjs';
const [rootId,dayDirectory,sessionDirectory]=process.argv.slice(2);
if(!rootId||!dayDirectory||!sessionDirectory)throw Error('Usage: probe-active-skill-requests ROOT_ID ABSOLUTE_NATIVE_DAY ABSOLUTE_PI_SESSIONS');
const jsonl=file=>fs.readFileSync(file,'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const events=jsonl(findNativeFile(rootId,dayDirectory)),ids=[];
for(const event of events){const item=event.payload?.item;if(item?.type!=='McpToolCall'||item.tool!=='pi_delegate')continue;for(const content of item.result?.content??[]){try{const result=JSON.parse(content.text);if(result.id)ids.push(result.id);}catch{}}}
const names=fs.readdirSync(sessionDirectory),workers=[];
for(const [index,id] of [...new Set(ids)].entries()){
  const name=names.find(name=>name.endsWith('_'+id+'.jsonl'));if(!name)continue;
  const file=path.join(sessionDirectory,name),records=jsonl(file),sidecar=file+'.request-shape.jsonl';
  const requests=fs.existsSync(sidecar)?jsonl(sidecar):[];
  const injected=records.filter(record=>record.type==='message'&&record.message?.role==='user').flatMap(record=>record.message.content??[]).filter(part=>part.type==='text').flatMap(part=>[...part.text.matchAll(/<skill name="([^"]+)"/g)].map(match=>match[1]));
  const calls=records.filter(record=>record.type==='message'&&record.message?.role==='assistant').flatMap(record=>record.message.content??[]).filter(part=>part.type==='toolCall'&&part.name==='read');
  workers.push({worker:index+1,payloads:requests.length,qualified_payloads:requests.filter(request=>request.native_skill_hint_qualified).length,
    reread_injected_skills:calls.filter(call=>injected.some(name=>String(call.arguments.path).replaceAll('\\','/').endsWith('/'+name+'/SKILL.md'))).length});
}
console.log(JSON.stringify({workers}));
