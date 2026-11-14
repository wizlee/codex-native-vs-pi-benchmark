import fs from 'node:fs';
import path from 'node:path';
import {taskFiles} from './cases.mjs';
const batch=process.argv[2]??'runs/2026-11-13-fair-read-pilot';
const schedule=JSON.parse(fs.readFileSync(path.join(batch,'schedule.json'),'utf8'));
const artifacts=[];
for(const r of schedule.runs){
  const tag=process.argv.includes('--final')&&fs.existsSync(path.join(batch,`${r.run_id}.repair1.observation.json`))?'.repair1':'';
  const original=JSON.parse(fs.readFileSync(path.join(batch,'artifacts',`${r.blind_id}${tag}.json`),'utf8'));
  const observation=JSON.parse(fs.readFileSync(path.join(batch,`${r.run_id}${tag}.observation.json`),'utf8'));
  const fixtures=taskFiles(r.task),files={},aliases={},seen=new Map();
  const redact=s=>s.replaceAll(observation.cwd,'[original-trial-directory]')
    .replaceAll(observation.cwd.replaceAll('\\','\\\\'),'[original-trial-directory]')
    .replaceAll(r.run_id,r.blind_id)
    .replace(/(['"])([^'"\n]*\b(?:Pi|native|Codex)\b[^'"\n]*)\1/gi,(_,quote,body)=>quote+body.replace(/\b(?:Pi|native|Codex)\b/gi,'[backend]')+quote)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,'[session-id]');
  for(const [name,body] of Object.entries(original.files)){
    if(name.startsWith('work/')||['PROMPT.md','KEEP.txt','SOURCES.md'].includes(name))continue;
    if(Object.hasOwn(fixtures,name)&&fixtures[name]===body&&name!=='summary.mjs')continue;
    if(seen.has(body)){aliases[name]=seen.get(body);continue;}
    seen.set(body,name);files[name]=redact(body);
  }
  artifacts.push({blind_id:r.blind_id,task:r.task,files,identical_file_aliases:aliases,
    source_packet_unchanged:!fixtures['SOURCES.md']||original.files['SOURCES.md']===fixtures['SOURCES.md'],
    keep_unchanged:original.files['KEEP.txt']===fixtures['KEEP.txt'],answer:redact(original.answer),checks:original.checks});
}
artifacts.sort((a,b)=>a.blind_id.localeCompare(b.blind_id));
const packet={tasks:{T02:taskFiles('T02'),T05:taskFiles('T05')},artifacts};
const batchName=path.basename(batch);
const repairedIds=new Set(schedule.runs.filter(r=>fs.existsSync(path.join(batch,`${r.run_id}.repair1.observation.json`))).map(r=>r.blind_id));
const packetPath=path.resolve(batch,process.argv.includes('--final')?'blind-review-packet.final.local.json':'blind-review-packet.local.json');
fs.writeFileSync(packetPath,JSON.stringify(packet,null,2)+'\n');
const prompt=`Act as independent fresh-session artifact reviewer. Do not read other chats, benchmark repository, raw session logs, or prior results. Do not use subagents. Work only in your own directory. No external messages, model/settings changes, or web research. Use caveman and unslop style as applicable.

Eight anonymized artifacts follow. Backend, time, cost and run order withheld. Grade actual code/documents against original public task and source packet, not answer length. Public predeclared check results are evidence, not proof of complete correctness. Read implementations. Verify decisive claims. For any alleged defect, supply concrete input, expected/actual behavior, and reproduce in your own copied files when possible. Apply same standards to every artifact. Do not invent requirements.

Score each dimension 0..4, half points allowed: correctness/completeness weight40; human verifiability20; simplest sufficient design15; research/evidence15; instruction/scope10. Anchors: 0 unusable/unsupported; 2 substantial gaps or repair; 4 complete, clear, reproducible, justified, no unnecessary complexity. Source research for code means supplied requirements and repository evidence, not mandatory browsing. More files/tests/sources earn no automatic bonus. Assess primary submitted API/document; work/original repro files excluded. Supporting code may have orchestration metadata/identity strings redacted; this is not an artifact defect. Native/Pi labels may be replaced by [backend]. Do not infer identity from style. Duplicate file aliases share exact original bytes.

T02 mandatory contract is exact PROMPT.md below. Test latest valid winner per ID, tie position, void, signed amounts, invalid entries, ordering and immutability. T05 mandatory: conditional North recommendation, complete prices $12 versus $21, current at-least-once semantics and stale-source conflict, measured latency distinguished from production guarantee, useful next validation, decisive section citations, <=600 words. Original SOURCES.md below is authoritative even if artifact altered its copy.

Grade artifact quality separately from delegation status. Honest reported worker incompatibility does not automatically make correct code incorrect. Worker completion/tool-scope compliance will be audited separately. Human review time is unknown; you provide provisional AI ratings, not human ratings. No quality-equivalence claims.

Write outputs/SCORES.json with {"artifacts":[{"blind_id":"artifact-001","mandatory_pass":true,"critical_defect":false,"scores":{"correctness":4,"verification":4,"simplicity":4,"research":4,"instructions":4},"evidence":["Concrete evidence and any reproduced defect"]}],"review_limits":["..."]}. Include all eight exactly once. Critical defect means data corruption, invented decisive evidence, or unauthorized side effects demonstrated by supplied evidence. Do not repair originals or contact solvers. Final reply REVIEW_COMPLETE and file path. Keep review within 10 minutes.

ORIGINAL TASKS AND ANONYMIZED ARTIFACTS:
${JSON.stringify(packet)}
`;
const marker='ORIGINAL TASKS AND ANONYMIZED ARTIFACTS:';
const filePrompt=prompt.slice(0,prompt.indexOf(marker))+`ORIGINAL TASKS AND ANONYMIZED ARTIFACTS: Read exactly this frozen anonymous JSON file: ${packetPath}. This is an explicit exception to the repository-read restriction for this one file only. Do not read anything else in the benchmark folder. Parse JSON and inspect one artifact at a time; do not print the full packet. Confirm all eight primary artifact bodies were accessible before final scoring. If any tool output truncates, read a smaller selected artifact/file rather than grading missing evidence.\n`;
console.log(JSON.stringify(process.argv.includes('--updates-only')?{artifacts:artifacts.filter(a=>repairedIds.has(a.blind_id))}:{title:`Blind review ${batchName}`,directoryName:`${batchName}-blind-review`,prompt:filePrompt}));
