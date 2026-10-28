import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGameDNA } from '../src/game-dna.js';

test('Game DNA rejects short ideas',()=>{assert.throws(()=>buildGameDNA({idea:'hi'}),/kamida 8/);});
test('Game DNA returns exact script paths, dependencies and build instructions',()=>{
 const r=buildGameDNA({title:'Egg Simulator',idea:'Pet egg simulator with hatching, inventory, shop and upgrades'});
 assert.equal(r.manifest.schemaVersion,1);
 assert.ok(r.manifest.files.some(f=>f.path==='ServerScriptService/Server/Main.server.lua'));
 assert.ok(r.manifest.files.some(f=>f.path==='ReplicatedStorage/Shared/GameConfig'));
 assert.ok(r.manifest.folders.includes('ServerScriptService/Server/Systems'));
 assert.equal(r.manifest.dependencies.length,r.manifest.files.length);
 assert.match(r.buildPrompt,/complete Luau source/i);
 assert.match(r.buildPrompt,/Never claim Play-test passed/i);
 assert.match(r.markdown,/Dependencies/);
});
test('Game DNA contains unique script paths',()=>{
 const {manifest}=buildGameDNA({title:'Tycoon',idea:'Tycoon plots, currency, shop and upgrades'});
 const paths=manifest.files.map(f=>f.path);
 assert.equal(paths.length,new Set(paths).size);
 assert.ok(manifest.files.length<=12);
});
