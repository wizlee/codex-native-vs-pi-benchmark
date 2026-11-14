import test from 'node:test';
import assert from 'node:assert/strict';
import {knownSum,resourceNumber,resourceDollars,resourceOpening} from './report-resources.mjs';
test('missing usage cannot turn into zero dollars or a percentage claim',()=>{
  assert.equal(knownSum([1,null,3]),null);
  assert.equal(knownSum([1,2,3]),6);
  assert.equal(resourceDollars(null),'unknown');
  assert.equal(resourceNumber(undefined),'unknown');
  const arm={tokens_all:100,elapsed_s_per_accepted:10,estimated_api_usd_all:1};
  assert.match(resourceOpening(arm,{...arm,estimated_api_usd_all:null}),/unknown/);
  assert.match(resourceOpening(arm,{...arm,tokens_all:200,estimated_api_usd_all:2}),/50.0% fewer/);
  assert.match(resourceOpening({...arm,tokens_all:200},arm),/100.0% more processed tokens/);
});
