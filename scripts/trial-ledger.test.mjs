import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {nativeUsage,piUsage} from './trial-ledger.mjs';

function fixture(fn){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'benchmark-ledger-'));
  try{return fn(directory);}finally{
    const target=fs.realpathSync(directory),base=fs.realpathSync(os.tmpdir()),relative=path.relative(base,target);
    assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative)&&path.basename(target).startsWith('benchmark-ledger-'));
    fs.rmSync(target,{recursive:true});
  }
}
const write=(directory,name,entries)=>{const file=path.join(directory,name);fs.writeFileSync(file,entries.map(JSON.stringify).join('\n')+'\n');return file;};

test('native adapter uses exclusive responses, not repeated cumulative snapshots',()=>fixture(directory=>{
  const u={input_tokens:100,cached_input_tokens:40,cache_write_input_tokens:0,output_tokens:10,reasoning_output_tokens:5,total_tokens:110};
  const es=[{type:'session_meta',timestamp:'2026-11-13T01:00:00Z',payload:{id:'root',model_provider:'openai',cwd:directory}},
    {type:'turn_context',timestamp:'2026-11-13T01:00:01Z',payload:{model:'example',effort:'high'}},
    ...[1,2].map(i=>({type:'token_usage_record',timestamp:`2026-11-13T01:00:0${i+1}Z`,ordinal:i,
      payload:{thread_id:'root',response_id:`call${i}`,usage:u,thread_token_usage:{input_tokens:i*100,output_tokens:i*10}}})),
    {type:'event_msg',timestamp:'2026-11-13T01:00:04Z',payload:{type:'token_count',info:{total_token_usage:{input_tokens:200,output_tokens:20}}}}];
  const r=nativeUsage(write(directory,'native.jsonl',es));
  assert.equal(r.reconciled,true);assert.equal(r.call_count,2);
  assert.equal(r.ledger.reduce((s,u)=>s+u.input_tokens+u.output_tokens,0),220);
  assert.equal(r.ledger[0].reasoning_tokens,5);
}));

test('Pi adapter joins disjoint input/cache buckets and keeps reasoning as output subset',()=>fixture(directory=>{
  const file=write(directory,'pi.jsonl',[{type:'session',id:'worker',timestamp:'2026-11-13T01:00:00Z'},
    {type:'message',id:'one',timestamp:'2026-11-13T01:00:01Z',message:{role:'assistant',provider:'openai-codex',model:'example',stopReason:'stop',usage:{input:60,cacheRead:30,cacheWrite:10,output:20,reasoning:5,totalTokens:120}}}]);
  const r=piUsage(file);assert.equal(r.reconciled,true);assert.equal(r.ledger[0].input_tokens,100);
  assert.equal(r.ledger[0].output_tokens,20);assert.equal(r.ledger[0].reasoning_tokens,5);
  assert.equal(r.agent_id,'worker');
}));

test('ledger reconciliation rejects inconsistent Pi totals',()=>fixture(directory=>{
  const file=write(directory,'pi.jsonl',[{type:'session',id:'worker',timestamp:'2026-11-13T01:00:00Z'},
    {type:'message',id:'one',timestamp:'2026-11-13T01:00:01Z',message:{role:'assistant',provider:'openai-codex',model:'example',usage:{input:60,cacheRead:30,cacheWrite:0,output:20,totalTokens:999}}}]);
  assert.equal(piUsage(file).reconciled,false);
}));
