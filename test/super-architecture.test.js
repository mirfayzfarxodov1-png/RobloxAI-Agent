import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildSuperBuildPlan, SUPER_VERSION, SUPER_WORKFLOWS } from '../src/super/index.js';

test('SUPER build package contains real architecture, model, QA and honest Studio statuses', () => {
  const result=buildSuperBuildPlan({title:'Steal an Egg',idea:'Multiplayer egg stealing tycoon with bases, pets, upgrades and shop'});
  assert.equal(result.version,SUPER_VERSION);
  assert.equal(result.title,'Steal an Egg');
  assert.ok(result.architecture.plan.folderTree.some(x=>x.path==='ServerScriptService/Services'));
  assert.ok(result.buildSpec.prompt.includes('QURUVCHI V3'));
  assert.ok(result.model.parts.length>=3);
  assert.ok(result.qa.tests.length>=6);
  assert.equal(result.localChecks.find(x=>x.id==='playtest').status,'not-run');
  assert.equal(result.localChecks.find(x=>x.id==='studio').status,'requires-plugin-confirmation');
  assert.ok(SUPER_WORKFLOWS.some(x=>x.id==='implementation'));
});

test('V2 and SUPER browser bundles are served from organized directories', () => {
  const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  assert.match(html,/\/v2\/index\.js/);
  assert.match(html,/\/super\/index\.js/);
  assert.match(html,/\/v2\/style\.css/);
  assert.match(html,/\/super\/style\.css/);
  assert.ok(fs.existsSync(new URL('../public/v2/README.md',import.meta.url)));
  assert.ok(fs.existsSync(new URL('../public/super/README.md',import.meta.url)));
});

test('unused legacy V2/V3 entry points are removed after migration', () => {
  for (const path of ['../src/v2.js','../src/v2-engine.js','../src/v3-engine.js']) {
    assert.equal(fs.existsSync(new URL(path,import.meta.url)),false,path+' should not remain');
  }
});
