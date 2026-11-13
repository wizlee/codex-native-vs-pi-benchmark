import fs from 'node:fs';
import path from 'node:path';
import {analyze,quality,measureRecord} from './benchmark.mjs';

const directory=path.resolve(process.argv[3]??'runs/2026-11-13-pilot');
const schedule=JSON.parse(fs.readFileSync(fs.existsSync(path.join(directory,'schedule.json'))?path.join(directory,'schedule.json'):'pilot-schedule.json','utf8'));
const review=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const firstReview=JSON.parse(fs.readFileSync(path.join(directory,'scores.first-pass.json'),'utf8'));
const rates=JSON.parse(fs.readFileSync(path.join(directory,'rates.json'),'utf8'));
const records=[],details=[];
for(const planned of schedule.runs){
  const initial=JSON.parse(fs.readFileSync(path.join(directory,`${planned.run_id}.observation.json`),'utf8'));
  const tag=fs.existsSync(path.join(directory,`${planned.run_id}.repair1.observation.json`))?'.repair1':'';
  const o=tag?JSON.parse(fs.readFileSync(path.join(directory,`${planned.run_id}${tag}.observation.json`),'utf8')):initial;
  const ledger=JSON.parse(fs.readFileSync(path.join(directory,`${planned.run_id}${tag}.usage.json`),'utf8'));
  const judged=review.artifacts.find(x=>x.blind_id===planned.blind_id);
  if(!judged)throw Error(`Missing blinded score ${planned.blind_id}`);
  const mandatory=o.functional_checks.functional_checks_pass&&judged.mandatory_pass&&o.workers_with_model_calls===2;
  const q=quality(judged.scores);
  const accepted=mandatory&&!judged.critical_defect&&q>=80&&judged.scores.correctness>=3&&judged.scores.verification>=3&&judged.scores.instructions>=3;
  const first=firstReview.artifacts.find(x=>x.blind_id===planned.blind_id);
  const firstAccepted=initial.functional_checks.functional_checks_pass&&first.mandatory_pass&&!first.critical_defect&&quality(first.scores)>=80&&first.scores.correctness>=3&&first.scores.verification>=3&&first.scores.instructions>=3;
  const maxInput=Math.max(...ledger.usage.map(u=>u.input_tokens));
  if(maxInput>272000)throw Error('Short-context pricing assumption failed');
  const r={run_id:planned.run_id,profile:planned.profile,task:planned.task,repeat:planned.repeat,arm:planned.arm,
    status:'completed',mandatory_pass:mandatory,critical_defect:judged.critical_defect,first_pass_accepted:firstAccepted,
    repair_rounds:tag?1:0,scores:judged.scores,elapsed_s:o.delivery_s,delivery_s:o.delivery_s,
    review_s:0,intervention_s:0,usage_complete:ledger.usage_complete,zero_model_calls:false,
    expected_agent_ids:ledger.expected_agent_ids,other_cost_usd:0,usage:ledger.usage,
    quality_provenance:'Independent blinded AI reviewer; not human review',
    diagnostics:{human_acceptance:'unknown; not measured',human_review_time:'unknown; not measured',
      timing_scope:'root submission latency; independent AI review excluded',reasoning_parity:false,
      profile_scope:'Task-controlled/default-configuration pilot. Legacy controlled run IDs do not establish model/tool parity.',
      root_reported_blocked:initial.root_reported_blocked,workflow_fully_complete:!initial.root_reported_blocked,
      max_request_input:maxInput,review_evidence:judged.evidence}};
  records.push(r);
  const measured=measureRecord(r,rates);
  details.push({run_id:r.run_id,task:r.task,repeat:r.repeat,arm:r.arm,blind_id:planned.blind_id,
    success:measured.accepted,quality:measured.quality,first_pass_success:firstAccepted,first_pass_quality:quality(first.scores),
    first_delivery_s:initial.delivery_s,first_tokens:initial.total_tokens,repair_rounds:r.repair_rounds,
    workflow_fully_complete:!initial.root_reported_blocked,delivery_s:r.delivery_s,
    tokens:measured.tokens,root_tokens:measured.root_tokens,worker_tokens:measured.worker_tokens,
    uncached_input:ledger.usage.reduce((s,u)=>s+u.input_tokens-u.cached_input_tokens-u.cache_write_tokens,0),
    cached_input:ledger.usage.reduce((s,u)=>s+u.cached_input_tokens,0),
    output_tokens:ledger.usage.reduce((s,u)=>s+u.output_tokens,0),
    standard_api_equivalent_usd:measured.estimated_api_usd,checks:o.functional_checks,
    reviewer:judged});
}
const comparison=analyze(schedule,records,rates);
fs.writeFileSync(path.join(directory,'results.jsonl'),records.map(JSON.stringify).join('\n')+'\n');
fs.writeFileSync(path.join(directory,'comparison.json'),JSON.stringify(comparison,null,2)+'\n');
fs.writeFileSync(path.join(directory,'details.json'),JSON.stringify(details,null,2)+'\n');

const fmt=n=>n===null?'unknown':Math.round(n).toLocaleString('en-US');
const time=s=>{const v=Math.round(s);return `${Math.floor(v/60)}m ${String(v%60).padStart(2,'0')}s`;};
const average=a=>a.reduce((s,x)=>s+x,0)/a.length;
const lines=[`# Native versus Pi pilot results`,
  ``, `Observed result for these current configurations: native used ${(100*(1-comparison.arms.native.tokens_all/comparison.arms.pi.tokens_all)).toFixed(1)}% fewer processed tokens, ${(100*(1-comparison.arms.native.elapsed_s_per_accepted/comparison.arms.pi.elapsed_s_per_accepted)).toFixed(1)}% less agent work time per accepted artifact, and ${(100*(1-comparison.arms.native.estimated_api_usd_all/comparison.arms.pi.estimated_api_usd_all)).toFixed(1)}% lower standard API-equivalent cost, including allowed repairs. This is a small pilot, not a universal backend verdict.`,
  ``, `Eight fresh Codex root chats. Two task types, two repetitions, both arms. No root was forked from previous trial. Sequential execution in frozen balanced order.`,
  ``, `Scope: task-controlled/default-configuration pilot, not pure backend causal test. Root gpt-6.1-sol/xhigh; native readers xhigh; Pi readers high. Both readers can read actual source/skill files. Native may use read-only shell; Pi uses read/grep/find/ls. No manually recopied skill bodies. Host instructions/tool definitions differ.`,
  ``, `Quality scores below come from fresh-session AI review with arm labels withheld, using same configured model family as solvers. No independent human review or human time-to-acceptance measured. Success means functional/evidence checks plus provisional AI rubric pass. Final 100/100 ratings are a scoring ceiling, not proof of quality equivalence. Objective first-pass defects are more informative here.`,
  ``, `| Measure | Native | Pi |`, `|---|---:|---:|`];
for(const [label,fn] of [
  ['Provisional successes',rows=>`${rows.filter(r=>r.success).length}/${rows.length}`],
  ['First-pass contract success',rows=>`${rows.filter(r=>r.first_pass_success).length}/${rows.length}`],
  ['Fully completed delegation workflow',rows=>`${rows.filter(r=>r.workflow_fully_complete).length}/${rows.length}`],
  ['Repair rounds',rows=>fmt(rows.reduce((s,r)=>s+r.repair_rounds,0))],
  ['Mean first-pass AI quality /100',rows=>average(rows.map(r=>r.first_pass_quality)).toFixed(1)],
  ['Mean AI quality /100',rows=>average(rows.map(r=>r.quality)).toFixed(1)],
  ['Mean submission time',rows=>time(average(rows.map(r=>r.delivery_s)))],
  ['Mean first submission time',rows=>time(average(rows.map(r=>r.first_delivery_s)))],
  ['Total submission time',rows=>time(rows.reduce((s,r)=>s+r.delivery_s,0))],
  ['Total processed tokens',rows=>fmt(rows.reduce((s,r)=>s+r.tokens,0))],
  ['Tokens per provisional success',rows=>{const successes=rows.filter(r=>r.success).length;return successes?fmt(rows.reduce((s,r)=>s+r.tokens,0)/successes):'undefined';}],
  ['Total uncached input',rows=>fmt(rows.reduce((s,r)=>s+r.uncached_input,0))],
  ['Total cached input',rows=>fmt(rows.reduce((s,r)=>s+r.cached_input,0))],
  ['Total output including reasoning',rows=>fmt(rows.reduce((s,r)=>s+r.output_tokens,0))],
  ['Standard API-equivalent total',rows=>'$'+rows.reduce((s,r)=>s+r.standard_api_equivalent_usd,0).toFixed(3)],
])lines.push(`| ${label} | ${fn(details.filter(r=>r.arm==='native'))} | ${fn(details.filter(r=>r.arm==='pi'))} |`);
lines.push('', 'API-equivalent estimates use standard short-context rates from [official model page](https://developers.openai.com/api/docs/models/gpt-6.1-sol), retrieved 2026-11-13: $2/M uncached input, $0.10/M cached input, $10/M output. Actual subscription charges and quota attribution unknown. Every observed request stayed below 272K input tokens.',
  '', 'Root and worker usage, retries, skill-loading calls, source materialization, and final packaging are included. Calibration, study orchestration, independent checks, and AI judging are separate study overhead, excluded from arm submission metrics.',
  '', 'Independent blinded review found integer-cancellation precision loss in both Pi T02 outputs. Example cents `[9007199254740991, 2, -9007199254740991]` have exact final total 2; both initially returned 1. Every amount and final mathematical total fit safe integers. Native outputs returned 2 initially. This independent edge review extended the predeclared checker, which all eight originally passed. One root-only repair per failed submission was allowed; both repairs passed. Initial scores and outputs retained.',
  '', 'Both Pi T02 handoffs assigned execution-dependent diagnose workflow to read-only readers; all four readers reported incompatibility. Native readers provided reviews. This is a skill-scoping/configuration problem in tested handoffs, not proof of intrinsic Pi model weakness. No blocked worker was retried and no backend fallback occurred.',
  '', 'Submission times sum actual initial and repair work segments. Study/evaluator queue delays and AI judging are excluded, not claimed as zero human review time. Repairs occurred after batch review; observed cache behavior includes that timing.',
  '', '## Every scheduled trial', '', '| Task | Repeat | Arm | Final agent time | Final processed tokens | API equivalent | First pass | Repairs | Final contract pass |', '|---|---:|---|---:|---:|---:|---|---:|---|');
for(const r of details)lines.push(`| ${r.task} | ${r.repeat} | ${r.arm} | ${time(r.delivery_s)} | ${fmt(r.tokens)} | $${r.standard_api_equivalent_usd.toFixed(3)} | ${r.first_pass_success?'pass':'fail'} | ${r.repair_rounds} | ${r.success?'pass':'fail'} |`);
lines.push('', '## Interpretation limits', '',
  '- T02 tests small stateful debugging; T05 tests frozen-document evidence synthesis. Live web research, multi-file features, architecture, long context, recovery, and write-capable workers remain untested.',
  '- Two task types and two repetitions are too small for broad superiority or quality-equivalence claims. Conditional bootstrap intervals in comparison.json do not establish non-inferiority, especially when scores or success differences have no observed variation.',
  '- Server cache coldness and model-service latency cannot be forced. Both were handled with fresh chats, balanced order, and recorded cache counts.',
  '- Read isolation was enforced by instructions and separate folders, not a proved OS-level prohibition on reading evaluator files. No evaluator or prior outputs were supplied to solvers.',
  '- Different worker reasoning levels and host tool definitions limit backend attribution. Treat results as these default configurations, not universal native-versus-Pi performance. Earlier no-shell diagnostic runs are separate and excluded.',
  '- AI quality and verifiability ratings are provisional. Human review time and final human acceptance are unknown.',
  '- Worker reasoning was xhigh for native versus high for Pi, and roots selected different additional skills. These are whole current-configuration results; backend causality cannot be isolated.',
  '', '## Reproduce public evidence', '',
  '`node scripts/check-precision.mjs results/2026-11-13-fair-read-pilot --public --first-pass` reproduces both original Pi precision failures and both native passes.',
  '', '`node scripts/check-precision.mjs results/2026-11-13-fair-read-pilot --public` verifies all four final implementations.',
  '', '`node scripts/benchmark.mjs analyze results/2026-11-13-fair-read-pilot/schedule.json results/2026-11-13-fair-read-pilot/results.jsonl results/2026-11-13-fair-read-pilot/rates.json` reproduces resource arithmetic. Published call/agent IDs are anonymized; local original lineage retained privately.',
  '', 'Public evidence includes anonymized exclusive-call ledgers, primary synthetic artifacts, first/final scores, checks, and failure reproductions. Full local lineage and supplementary orchestration proof remain private in ignored runs/. Raw session logs are not published. The live collection helper can rebuild owner-local reports from those selected private exports.');
fs.writeFileSync(path.join(directory,'RESULTS.md'),lines.join('\n')+'\n');
console.log(JSON.stringify({runs:details.length,summary:comparison.arms,report:path.join(directory,'RESULTS.md')}));
