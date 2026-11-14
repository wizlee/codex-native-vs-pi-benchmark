// Reads only sessions explicitly selected in this batch's specs. No model calls.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { findNativeFile, nativeUsage, piUsage } from './trial-ledger.mjs';

export function cacheGroups(ledger) {
  const groups = { first: ledger.slice(0, 1), later: ledger.slice(1), all: ledger };
  return Object.fromEntries(Object.entries(groups).map(([name, calls]) => {
    const sum = key => calls.reduce((total, call) => total + (call[key] ?? 0), 0);
    const input = sum('input_tokens'), cached = sum('cached_input_tokens');
    return [name, { calls: calls.length, input_tokens: input, cached_input_tokens: cached,
      uncached_input_tokens: input - cached, output_tokens: sum('output_tokens'),
      cached_share: input ? cached / input : null }];
  }));
}

export function shapeSummary(records) {
  return {
    provider_requests: records.length,
    unsupported_requests: records.filter(record => record.unsupported).length,
    instruction_variants: new Set(records.map(record => record.instructions_hash)).size,
    tool_schema_variants: new Set(records.map(record => record.tools_hash)).size,
    tool_order_variants: new Set(records.map(record => JSON.stringify(record.tool_names))).size,
    cache_key_variants: new Set(records.map(record => record.cache_key_hash)).size,
    cache_key_present: records.every(record => !!record.cache_key_hash),
    instruction_chars: records.map(record => record.instructions_chars),
    input_items: records.map(record => record.input_shape?.length ?? 0),
    qualified_skill_hint_requests: records.every(record=>typeof record.native_skill_hint_qualified==='boolean')?records.filter(record=>record.native_skill_hint_qualified).length:null,
    // Deliberately omit request hashes, session/cache keys, prompts, and reasoning.
  };
}

export function analyzeWorkerCache(batch, observedOnly = false) {
  const read = name => JSON.parse(fs.readFileSync(path.join(batch, name), 'utf8'));
  const planned=read('schedule.json').runs;
  const selected=observedOnly?planned.filter(run=>fs.existsSync(path.join(batch,`${run.run_id}.spec.json`))):planned;
  const runs = selected.map(run => {
    const spec = read(`${run.run_id}.spec.json`);
    const files = run.arm === 'pi' ? spec.pi_session_files
      : spec.native_worker_ids.map(id => findNativeFile(id, spec.native_day_directory));
    const shapes = files.map(file => {
      const sidecar = `${file}.request-shape.jsonl`;
      return fs.existsSync(sidecar) ? fs.readFileSync(sidecar, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse) : [];
    });
    const first = shapes.map(records => records[0]).filter(Boolean);
    return { run_id: run.run_id, arm: run.arm,
      cross_worker_shape: first.length === files.length && first.length > 1 ? {
        shared_first_instructions: new Set(first.map(record => record.instructions_hash)).size === 1,
        shared_first_tool_schemas: new Set(first.map(record => record.tools_hash)).size === 1,
        distinct_session_cache_keys: new Set(first.map(record => record.cache_key_hash)).size === first.length,
      } : null,
      workers: files.map((file, index) => {
      const usage = run.arm === 'pi' ? piUsage(file) : nativeUsage(file, 'worker');
      const records = shapes[index];
      return { worker: index + 1, groups: cacheGroups(usage.ledger),
        error_records:usage.error_count,usage_reconciled:usage.reconciled,
        request_shape: records.length ? shapeSummary(records) : null,
        request_vs_usage_difference: records.length ? records.length - usage.ledger.length : null };
    }) };
  });
  return { method: 'First requests are not guaranteed cold. Later requests measure within-worker reuse. Service routing/warmness unknown. Native request payloads unavailable; no request-shape parity claim. Zero-usage error records do not establish zero billable usage.', coverage:{planned:planned.length,observed:runs.length,unexecuted:planned.filter(run=>!selected.includes(run)).map(run=>run.run_id)},runs };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = analyzeWorkerCache(process.argv[2],process.argv.includes('--observed-only'));
  if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(result));
}
