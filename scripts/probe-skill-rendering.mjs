// Selected trace replay through installed Pi's actual system-message renderer.
// No provider call, worker retry, permission answer, or raw prompt publication.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const [hook,piRoot,session,output]=process.argv.slice(2);
if(!hook||!piRoot||!session||!output)throw Error('Usage: probe-skill-rendering HOOK PI_PACKAGE_ROOT SELECTED_SESSION OUTPUT');
const {qualifySkillLoading,loadedNativeSkills}=await import(pathToFileURL(path.resolve(hook)).href);
const renderer=path.join(piRoot,'node_modules/@earendil-works/pi-ai/dist/utils/text.js');
const {getSystemMessageText}=await import(pathToFileURL(renderer).href);
const messages=fs.readFileSync(session,'utf8').trim().split(/\r?\n/).map(JSON.parse).filter(entry=>entry.type==='message'&&['system','user'].includes(entry.message?.role)).map(entry=>entry.message);
const system=messages.find(message=>message.role==='system');if(!system)throw Error('Selected session has no recorded system message');
const decode=value=>value.replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
const inventory=[...getSystemMessageText(system).matchAll(/<skill>\s*<name>([\s\S]*?)<\/name>[\s\S]*?<location>([\s\S]*?)<\/location>\s*<\/skill>/g)].map(match=>({name:decode(match[1]),filePath:decode(match[2])}));
const result=qualifySkillLoading(messages,inventory),after=result.find(message=>message.role==='system');
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const record={scope:'Selected recorded system/native skill bodies through installed Pi renderer; no model call or raw body output',hook_sha256:hash(hook),renderer_sha256:hash(renderer),matched_native_bodies:loadedNativeSkills(messages,inventory).length,
  hint_qualified_before:getSystemMessageText(system).includes('Already injected native skills:'),hint_qualified_after:getSystemMessageText(after).includes('Already injected native skills:'),
  tool_additions_preserved:JSON.stringify(system.toolsAdded)===JSON.stringify(after.toolsAdded),tool_removals_preserved:JSON.stringify(system.toolsRemoved)===JSON.stringify(after.toolsRemoved),
  section_order_preserved:JSON.stringify(Object.keys(system.sections??{}))===JSON.stringify(Object.keys(after.sections??{}))};
fs.writeFileSync(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(record));
