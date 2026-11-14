// Runs the installed extension runner against selected recorded prompt evidence.
// No Pi task, provider request, credential, or permission decision.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const [hook,piRoot,session,output]=process.argv.slice(2);
if(!hook||!piRoot||!session||!output)throw Error('Usage: probe-provider-skill-hook HOOK PI_ROOT SELECTED_SESSION OUTPUT');
const {default:register}=await import(pathToFileURL(path.resolve(hook)).href);
const {ExtensionRunner}=await import(pathToFileURL(path.join(piRoot,'dist/core/extensions/runner.js')).href);
const {getSystemMessageText}=await import(pathToFileURL(path.join(piRoot,'node_modules/@earendil-works/pi-ai/dist/utils/text.js')).href);
const messages=fs.readFileSync(session,'utf8').trim().split(/\r?\n/).map(JSON.parse).filter(entry=>entry.type==='message'&&['system','user'].includes(entry.message?.role)).map(entry=>entry.message);
const system=messages.find(message=>message.role==='system');if(!system)throw Error('Missing recorded system message');
const input=messages.filter(message=>message.role==='user').map(message=>({...message,content:typeof message.content==='string'?[{type:'input_text',text:message.content}]:message.content.map(part=>part.type==='text'?{...part,type:'input_text'}:part)}));
const payload={model:'gpt-6.1-sol',instructions:getSystemMessageText(system),input,tools:system.toolsAdded??[],prompt_cache_key:'synthetic-isolated-key',parallel_tool_calls:true};
const handlers=new Map();register({on:(name,handler)=>handlers.set(name,[...(handlers.get(name)??[]),handler])});
let observerQualified=false;
const runner={extensions:[{path:'synthetic-hook',handlers},{path:'synthetic-observer',handlers:new Map([['before_provider_request',[(event)=>{observerQualified=event.payload.instructions.includes('Already injected native skills:');}]]])}],createContext:()=>({}),emitError:error=>{throw Error(error.error);}};
const result=await ExtensionRunner.prototype.emitBeforeProviderRequest.call(runner,payload);
const record={scope:'Installed Pi ExtensionRunner with selected recorded catalog/native body; no model call or raw body output',hook_sha256:createHash('sha256').update(fs.readFileSync(hook)).digest('hex'),
  hook_registered:handlers.has('before_provider_request'),renderer_input_unqualified:!payload.instructions.includes('Already injected native skills:'),observer_received_qualified_payload:observerQualified,
  raw_payload_returned:result.model===payload.model&&result.payload===undefined,input_identity_preserved:result.input===payload.input,tools_identity_preserved:result.tools===payload.tools,
  session_cache_key_preserved:result.prompt_cache_key===payload.prompt_cache_key,parallel_tool_calls_preserved:result.parallel_tool_calls===payload.parallel_tool_calls};
if(!record.observer_received_qualified_payload||!record.raw_payload_returned||!record.input_identity_preserved||!record.tools_identity_preserved)throw Error('Provider hook integration failed');
fs.writeFileSync(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(record));
