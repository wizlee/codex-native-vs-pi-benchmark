import test from 'node:test';
import assert from 'node:assert/strict';
import {rootTrace,publicTrace,summarize,piCallOutcome} from './analyze-orchestration.mjs';

const event=(ordinal,type,payload)=>({ordinal,type,payload,timestamp:`2026-11-14T00:00:${String(ordinal).padStart(2,'0')}Z`});
const usage=(input,output)=>({usage:{input_tokens:input,output_tokens:output,total_tokens:input+output,cached_input_tokens:input-10}});
test('failed waits and expired IDs remain evidence rather than aborting trace export',()=>{
  const item={arguments:{waitMs:60000},duration:{secs:1,nanos:0},result:{content:[{type:'text',text:'{"code":"UNKNOWN_WORKER","error":"private detail"}'}]}};
  const result=piCallOutcome(item,true);
  assert.equal(result.error_code,'UNKNOWN_WORKER');assert.equal(result.result_available,false);assert.equal(result.pending_ui,null);
  assert.ok(!JSON.stringify(result).includes('private detail'));
  assert.equal(piCallOutcome({arguments:{}},false).state,'unavailable');
});
test('usage attribution follows emitted calls, not previous tool outputs',()=>{
  const events=[
    event(1,'response_item',{type:'custom_tool_call',call_id:'a',name:'exec',input:'text(await tools.mcp__pi__pi_status({id:"worker",waitMs:10000}));'}),
    event(2,'token_usage_record',usage(100,5)),
    event(3,'response_item',{type:'custom_tool_call_output',call_id:'a',output:JSON.stringify({content:[{type:'text',text:JSON.stringify({state:'running',selectedSkills:[],pendingUiCount:0,text:''})}]})}),
    event(4,'response_item',{type:'custom_tool_call',call_id:'b',name:'exec',input:'text(await tools.apply_patch("patch"));'}),
    event(5,'token_usage_record',usage(130,8)),
    event(6,'response_item',{type:'custom_tool_call_output',call_id:'b',output:'ok'}),
    event(7,'response_item',{type:'message',role:'assistant',phase:'final_answer',content:[{text:'Done'}]}),
    event(8,'token_usage_record',usage(145,3)),
  ];
  const trace=rootTrace(events);
  assert.deepEqual(trace.map(c=>c.category),['coordination_only','implementation_and_verification','final']);
  assert.equal(trace[0].snapshots.length,1);
  assert.equal(trace[1].snapshots.length,0);
  assert.equal(trace.reduce((s,c)=>s+c.total_tokens,0),391);
});
test('public trace retains durations without absolute timestamps',()=>{
  const result=publicTrace({runs:[{root:[{time:'2026-11-14T00:00:10Z',total_tokens:100}],workers:[{start:'2026-11-14T00:00:12Z',end:'2026-11-14T00:00:20Z',span_s:8}]}]});
  assert.equal(result.runs[0].root[0].seconds_from_first_response,0);
  assert.equal(result.runs[0].workers[0].end_from_first_root_response_s,10);
  assert.equal('time' in result.runs[0].root[0],false);
  assert.equal('start' in result.runs[0].workers[0],false);
});

test('controller waits are coordination and count their complete response usage',()=>{
  const trace=rootTrace([
    event(1,'response_item',{type:'custom_tool_call',call_id:'wait',name:'exec',input:'text(await tools.mcp__pi__pi_wait({ids:["a","b"],waitMs:60000}));'}),
    event(2,'token_usage_record',usage(100,3)),
    event(3,'response_item',{type:'custom_tool_call_output',call_id:'wait',output:'{"reason":"settled","workers":[]}'}),
  ]);
  assert.equal(trace[0].category,'coordination_only');
  assert.equal(trace[0].total_tokens,103);
});
test('symmetric round and size decomposition exactly reconciles root token gap',()=>{
  const run=(arm,tokens)=>({arm,root:tokens.map(n=>({category:'coordination_only',total_tokens:n,input_tokens:n-1,output_tokens:1,cached_input_tokens:0,output_chars:0,snapshots:[]})),workers:[],pi_status_calls:[],native_completion_events:0});
  const s=summarize([run('native',[100,120]),run('pi',[120,130,150])]);
  assert.equal(s.root_token_gap,180);
  assert.ok(Math.abs(s.root_gap_decomposition.extra_rounds+s.root_gap_decomposition.larger_average_round-180)<1e-10);
});
