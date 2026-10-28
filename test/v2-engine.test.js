import test from 'node:test';
import assert from 'node:assert/strict';
import { V2_TECHNOLOGIES, runV2Toolkit } from '../src/v2-engine.js';

test('V2 registry exposes ten distinct technologies',()=>{
  assert.equal(V2_TECHNOLOGIES.length,10);
  assert.equal(new Set(V2_TECHNOLOGIES.map(x=>x.id)).size,10);
});
test('seeded world blueprint is deterministic and contains 12 zones',()=>{
  const a=runV2Toolkit({action:'world-blueprint',seed:'test-map'});
  const b=runV2Toolkit({action:'world-blueprint',seed:'test-map'});
  assert.deepEqual(a,b);
  assert.equal(a.zones.length,12);
});
test('Luau audit returns a clear empty-input message',()=>{
  assert.match(runV2Toolkit({action:'luau-audit'}).summary,/kodini kiriting/);
});
test('Luau audit flags a tight infinite loop',()=>{
  const result=runV2Toolkit({action:'luau-audit',source:'while true do\n print("x")\nend'});
  assert.ok(result.findings.some(x=>x.level==='warning'));
});
test('performance audit flags common costly patterns',()=>{
  const result=runV2Toolkit({action:'performance-audit',source:'while true do\n game:GetService("RunService").Heartbeat:Wait()\nend\nworkspace:GetDescendants()'});
  assert.ok(result.findings.length>0);
});
test('unknown engine action is rejected',()=>{
  assert.throws(()=>runV2Toolkit({action:'nope'}),/Noma’lum/);
});
