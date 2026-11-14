import fs from 'node:fs';
import os from 'node:os';
import {taskFiles} from './cases.mjs';
import {makeSchedule} from './benchmark.mjs';

const runId=process.argv[2];
const matched=process.argv.includes('--matched-workers');
const fair=!process.argv.includes('--diagnostic-no-shell');
const schedule=matched?makeSchedule('pilot',20261112,'controlled'):fair?makeSchedule('pilot',20261112,'usual'):JSON.parse(fs.readFileSync(new URL('../pilot-schedule.json',import.meta.url),'utf8'));
const run=schedule.runs.find(r=>r.run_id===runId);
if(!run)throw Error('Unknown pilot run');
const home=os.homedir().replaceAll('\\','/');
const skills=[
  {name:'caveman',path:`${home}/.agents/skills/caveman/SKILL.md`},
  {name:'unslop',path:`${home}/.codex/plugins/cache/openai-curated-remote/pstack-plugin/0.2.0/skills/unslop/SKILL.md`},
];
if(matched&&run.task==='T05')skills.push({name:'technical-writing',path:`${home}/.codex/plugins/cache/openai-curated-remote/pstack-plugin/0.2.0/skills/technical-writing/SKILL.md`});
const backend=run.arm==='native'?`For this benchmark run only, explicit authorization overrides Pi-default delegation policy. Use Codex native subagents. Never use Pi for delegation. Start workers with fork_turns none if supported. Give complete self-contained packet and skill instructions; no inherited prior task history. If worker cannot access filesystem without shell/MCP, provide exact root-verified file snapshots and actual required skill text. Record this limitation.`:
`Use Pi MCP workers only, never native subagents. Discover resources for absolute current working directory and poll status. Pass required skill names plus absolute skillPaths. Use access read. Keep polling while workers active so human sees pending approval forms. Never answer dialogs, change gates/trust, auto-retry failures, or fall back to native. Report blocked work faithfully.`;
const model=matched?`Human explicitly authorized matching BOTH worker configurations to gpt-6.1-sol/high, while retaining identical current root defaults. Root must keep its configured model/reasoning. Native spawn arguments: model gpt-6.1-sol, reasoning_effort high, fork_turns none. Pi delegate arguments: model openai-codex/gpt-6.1-sol, thinking high, access read. These are per-worker ephemeral overrides; never edit global settings. Report actual resolved values. Do not substitute a different model/effort.`:`Keep root and worker configured defaults. No model/thinking overrides. Actual native/Pi reasoning may differ; record mismatch. This is configuration-confounded pilot, not pure backend causal test.`;
const prompt=`Execute isolated benchmark run ${run.run_id} in this fresh chat's OWN working directory. Do not use any prior conversation or other task's outputs. Do not create further root chats. Do not inspect benchmark repository, evaluator, sibling directories, session logs, memories, or earlier trial results. Reading required skill files is allowed. No external messages, commits, pushes, installs, or settings changes.

First materialize all public fixture files below verbatim in current working directory. Task-time fixture creation is included equally in both arms. Preserve KEEP.txt exactly. Then complete PROMPT.md. Root alone edits and runs verification commands. Add useful small regression tests. Do not grade yourself or invent token counts.

Use exactly TWO read-only workers, no descendants. Worker 1 inspects implementation/evidence and proposes smallest complete solution. Worker 2 independently inspects requirements, edge cases, verification gaps. Start both before implementation. Wait for both results before final integration. Workers cannot write, run shell, browse web, or call MCP tools. Give both entire task requirements and exact source snapshots from this packet, scope, constraints, relevant loaded skill text, expected reply shape. Both receive same complete input. Reply shape: findings, evidence paths/sections, proposed change, verification gaps.

${backend}
${model}

Required portable skills: ${JSON.stringify(skills)}. Root loads these and other applicable required skills, reporting names and incompatibilities. Native workers may use actual skill text supplied by root when no direct read tool. Pi must follow its native gated skill-loading workflow. Do not silently drop required skills. If unavoidable host/tool differences exist, record them.

Return completed task artifact plus rerunnable proof, changed files, honest remaining limits. Also write outputs/RUN_METADATA.json with run_id, current working directory, backend, worker IDs, Pi sessionFile paths when applicable, resolved models/thinking if exposed, selected skills, independent verification commands/results, context delivery method, and errors/limitations. Do not claim verified model values if tool did not expose them. Do not contact orchestrator; it reads artifacts. Finish final reply with RUN_COMPLETE or RUN_BLOCKED and concise artifact/check summary. Stop initial work at 20 minutes. No repair unless evaluator explicitly supplies feedback.

PUBLIC FIXTURE JSON:
${JSON.stringify(taskFiles(run.task),null,2)}
`;
let actualPrompt=prompt;
if(fair){
  actualPrompt=actualPrompt.replace('Workers cannot write, run shell, browse web, or call MCP tools.',
    'Workers cannot write, execute candidate code, browse web, or call external services. Workers MAY read/search/list files and required skills. Native workers may use read-only shell commands such as Get-Content, rg, and Get-ChildItem. Pi workers use native read/grep/find/ls. No file-changing commands. Root alone runs tests and edits.');
  actualPrompt=actualPrompt.replace('relevant loaded skill text','required skill names and absolute file paths');
  actualPrompt=actualPrompt.replace('If worker cannot access filesystem without shell/MCP, provide exact root-verified file snapshots and actual required skill text. Record this limitation.',
    'Workers read actual source/skill files using permitted read-only tools. Do not manually transcribe skill bodies. Supply exact task requirements, absolute working directory, source paths, and skill paths. Fresh worker history avoids sharing another reader\'s findings.');
  actualPrompt=actualPrompt.replace('Native workers may use actual skill text supplied by root when no direct read tool.',
    'Native workers must read actual required skill files using read-only tools; root must not rewrite or paste skill bodies.');
  actualPrompt=actualPrompt.replace('same complete input','same complete public inputs');
  actualPrompt+='\nFAIRNESS AMENDMENT: Equivalent semantic read access in both arms. No model/thinking overrides. Keep exactly two fresh read-only workers. Required skill bodies must be loaded from actual files, never manually recopied. Extra applicable skills use each host\'s normal loading. Host tool definitions and defaults remain observed setup differences. Do not inspect earlier diagnostic runs.\n';
}
if(matched){
  actualPrompt=actualPrompt.replaceAll('No model/thinking overrides.','Root defaults unchanged; explicit matched worker overrides apply.');
  actualPrompt+='\nMATCHED ROLE CONTRACT: Both workers are source reviewers and requirements auditors, not implementers or execution agents. Give BOTH exactly the required portable reviewer skill set listed above, loaded from actual files. Root owns diagnose, reproduction, test execution, build-the-lever, and implementation/proof workflows; do not transfer these execution-dependent root responsibilities to read-only reviewers. This is role scoping, not permission bypass: if a genuinely required reviewer skill is incompatible, stop/report it rather than ignore its rules. Native and Pi reviewers have identical role and skill requirements. For T02, root first reproduces ordinary duplicate/winner bug on original code, then provides the SAME observed reproduction evidence to both reviewers before implementation. No previous benchmark result or hidden test may be supplied.\n';
}
console.log(JSON.stringify({title:`${matched?'Matched-worker pilot':fair?'Fair-read pilot':'Pilot'} ${run.task} repeat ${run.repeat} ${run.arm}`,directoryName:`${matched?'matched-workers':fair?'fair-read':'benchmark'}-${run.task.toLowerCase()}-r${run.repeat}-${run.arm}-${matched?'20261114':'20261113'}`,prompt:actualPrompt,run}));
