// Read-only simulation against the installed Bridge class. No real Pi process or model.
import {EventEmitter} from 'node:events';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

export async function probe(Bridge){
  const bridge=new Bridge({config:{},root:'.'}),timers=[];
  const worker=()=>({id:'probe',cwd:'.',access:'read',state:'running',selectedSkills:[],excludedSkills:[],notices:[],pendingUi:[],text:'',changes:new EventEmitter(),changedAt:Date.now()});
  const results=[];
  try{
    let w=worker();bridge.workers.set(w.id,w);
    timers.push(setTimeout(()=>bridge.onRecord(w,{type:'message_update',assistantMessageEvent:{type:'text_delta',delta:'x'}}),30));
    let start=performance.now(),s=await bridge.status(w.id,{waitMs:1000});
    assert.equal(s.state,'running');assert.equal(s.text,'');
    results.push({case:'stream_delta',requested_wait_ms:1000,observed_wait_ms:performance.now()-start,state:s.state,visible_text_chars:s.text.length});

    w=worker();bridge.workers.set(w.id,w);
    timers.push(setTimeout(()=>bridge.onRecord(w,{type:'agent_settled',aborted:false}),30));
    start=performance.now();s=await bridge.status(w.id,{waitMs:1000});assert.equal(s.state,'completed');
    results.push({case:'completion',requested_wait_ms:1000,observed_wait_ms:performance.now()-start,state:s.state});

    w=worker();bridge.workers.set(w.id,w);
    timers.push(setTimeout(()=>bridge.onRecord(w,{type:'extension_ui_request',method:'confirm',id:'synthetic-dialog'}),30));
    start=performance.now();s=await bridge.status(w.id,{waitMs:1000});
    assert.equal(s.state,'waiting_for_user');assert.equal(s.pendingUiCount,1);
    results.push({case:'pending_dialog',requested_wait_ms:1000,observed_wait_ms:performance.now()-start,state:s.state,pending_ui:s.pendingUiCount,answer_supplied:false});
    return results;
  }finally{timers.forEach(clearTimeout);clearInterval(bridge.reaper);bridge.workers.clear();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const file=process.argv[2];if(!file)throw Error('Supply installed pi-bridge/src/bridge.mjs path');
  const {Bridge}=await import(pathToFileURL(path.resolve(file)).href);
  const result={scope:'Synthetic events on installed Bridge class; no model calls, real workers, settings changes, or permission answers',bridge_source_sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex'),results:await probe(Bridge)};
  if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}
