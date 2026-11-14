import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const [before,after,output]=process.argv.slice(2);
if(!before||!after||!output)throw Error('Usage: export-bridge-patch BEFORE_ROOT AFTER_ROOT OUTPUT');
const files=['src/bridge.mjs','src/server.mjs','src/worker-prompt.mjs','src/worker-skill-loading.mjs','src/request-shape.mjs',
  'test/bridge.test.mjs','test/mcp.test.mjs','test/fake-pi.mjs','test/status.test.mjs','test/request-shape.test.mjs','test/worker-skill-loading.test.mjs'];
let patch='',changed=0;
for(const file of files){
  const old=path.join(before,file),next=path.join(after,file),exists=fs.existsSync(old);
  if(!exists&&!fs.existsSync(next))continue;
  const result=spawnSync('git',['diff','--no-index','--no-ext-diff','--no-color','--',exists?old:'/dev/null',next],{encoding:'utf8'});
  if(![0,1].includes(result.status))throw Error(result.stderr);
  if(!result.stdout)continue;
  changed++;
  patch+=result.stdout.split(/\r?\n/).map(line=>line.startsWith('diff --git ')?`diff --git a/${file} b/${file}`
    :line.startsWith('--- ')?exists?`--- a/${file}`:'--- /dev/null'
    :line.startsWith('+++ ')?`+++ b/${file}`:line).join('\n');
}
if(/[A-Z]:[\\/]+Users[\\/]|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(patch))throw Error('Private path or session identity in patch');
fs.writeFileSync(output,patch,{flag:'wx'});
console.log(JSON.stringify({files:changed,bytes:Buffer.byteLength(patch)}));
