// No Pi process, provider, filesystem write, or real permission answer.
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [source,output]=process.argv.slice(2);
if(!source)throw Error('Usage: probe-pi-recovery ABSOLUTE_BRIDGE_MODULE [OUTPUT]');
const {Bridge}=await import(pathToFileURL(path.resolve(source)).href);
const bridge=new Bridge({config:{},root:'.'});
const worker=()=>({id:'synthetic',cwd:'.',state:'running',text:'',notices:[],pendingUi:[],changes:new EventEmitter(),submitted:true});
const assistant=(stopReason,errorMessage)=>({type:'message_end',message:{role:'assistant',stopReason,errorMessage,content:[]}});
let recovery,fatal;
try{
  const first=worker();bridge.workers.set(first.id,first);
  bridge.onRecord(first,assistant('error','Synthetic transient error'));
  bridge.onRecord(first,assistant('toolUse'));
  bridge.onRecord(first,assistant('stop'));
  bridge.onRecord(first,{type:'agent_settled',aborted:false});
  recovery={state:first.state,error_present:!!first.error,needs_reconciliation:first.needsReconciliation};
  const second=worker();bridge.workers.set(second.id,second);
  bridge.fail(second,new Error('Synthetic fatal bridge error'));
  bridge.onRecord(second,assistant('stop'));
  bridge.onRecord(second,{type:'agent_settled',aborted:false});
  fatal={state:second.state,error_preserved:second.error==='Synthetic fatal bridge error',needs_reconciliation:second.needsReconciliation};
}finally{clearInterval(bridge.reaper);bridge.workers.clear();}
const result={scope:'Synthetic RPC event replay only; no real worker, retry, provider, or permission decision',bridge_sha256:createHash('sha256').update(fs.readFileSync(source)).digest('hex'),recovery,fatal};
if(output)fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
