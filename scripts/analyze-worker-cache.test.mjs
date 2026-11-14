import test from 'node:test';
import assert from 'node:assert/strict';
import { cacheGroups, shapeSummary } from './analyze-worker-cache.mjs';
test('first and later inputs reconcile without implying cold-cache state', () => {
  const result = cacheGroups([{ input_tokens: 100, cached_input_tokens: 20, output_tokens: 5 },
    { input_tokens: 150, cached_input_tokens: 100, output_tokens: 10 }]);
  assert.equal(result.all.input_tokens, result.first.input_tokens + result.later.input_tokens);
  assert.equal(result.all.cached_share, 120 / 250);
  assert.equal(result.later.uncached_input_tokens, 50);
  assert.equal(cacheGroups([]).all.cached_share, null);
});
test('shape summary detects schema/order drift and removes identifying hashes', () => {
  const record = { instructions_hash: 'private-prompt-digest', tools_hash: 'a', tool_names: ['read', 'ls'], cache_key_hash: 'private-cache-digest', instructions_chars: 30, input_shape: [] };
  const summary = shapeSummary([record, { ...record, tools_hash: 'b', tool_names: ['ls', 'read'] }]);
  assert.equal(summary.tool_order_variants, 2);
  assert.equal(summary.instruction_variants, 1);
  assert.equal(summary.cache_key_variants, 1);
  assert.ok(!JSON.stringify(summary).includes('private-'));
});
