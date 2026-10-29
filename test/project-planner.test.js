import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectPlan, renderProjectPlanMarkdown } from '../src/project-planner.js';

test('creates a normalized project plan with sensible defaults', () => {
  const plan = createProjectPlan({ title: '  Sky Realm  ', genre: 'RPG', complexity: 'small', features: ['Quest', 'Quest', '', 'Inventory'] });
  assert.equal(plan.title, 'Sky Realm');
  assert.equal(plan.complexity, 'small');
  assert.deepEqual(plan.features, ['Quest', 'Inventory']);
  assert.ok(plan.phases.length >= 3);
  assert.equal(plan.schemaVersion, 2);
  assert.ok(plan.guardrails.length >= 4);
});

test('bounds untrusted input and drops malformed list values', () => {
  const plan = createProjectPlan({
    title: 'x'.repeat(200),
    features: Array.from({ length: 50 }, (_, i) => 'feature-' + i),
    constraints: [' safe ', null, 'safe'],
    complexity: 'small',
    phases: [{ name: 'phase', goal: 'g'.repeat(1000), systems: ['A', 'A', 'B'] }],
  });
  assert.equal(plan.title.length, 100);
  assert.equal(plan.features.length, 20);
  assert.deepEqual(plan.constraints, ['safe']);
  assert.equal(plan.complexity, 'small');
  assert.equal(plan.phases[0].goal.length, 500);
  assert.deepEqual(plan.phases[0].systems, ['A', 'B']);
  assert.equal(createProjectPlan({ title: 'Invalid complexity', complexity: 'impossible' }).complexity, 'large');
});

test('renders a readable plan with sources, acceptance criteria, and honest save status', () => {
  const plan = createProjectPlan({
    title: 'Steal an Legacy', genre: 'Collection adventure', pitch: 'Collect rare relics, upgrade a base, unlock new zones.',
    sources: [{ title: 'Creator Hub DataStores', url: 'https://create.roblox.com/docs/cloud-services/data-stores', summary: 'Official DataStore guide' }],
    researchSummary: 'Research indicates a server-authoritative progression loop; source details need verification in Studio.',
  });
  const markdown = renderProjectPlanMarkdown(plan);
  assert.match(markdown, /# Steal an Legacy/);
  assert.match(markdown, /DataStore\/Profile saqlash tizimi kerak/);
  assert.match(markdown, /rejaning o‘zi test dalili emas/);
  assert.match(markdown, /Creator Hub DataStores/);
  assert.match(markdown, /Internet tadqiqoti xulosasi/);
  assert.match(markdown, /Qabul mezonlari/);
  assert.doesNotMatch(markdown, /Ma’lumot saqlash: hali tasdiqlanmagan/);
});

test('fills a large project plan with a concrete loop, features and ten phases', () => {
  const plan = createProjectPlan({ title: 'Steal an Legacy', genre: 'Roblox collection game', pitch: 'Players collect relics, protect their base, upgrade and unlock worlds.', phases: [{ name: 'Only phase from model', goal: 'Short model-generated phase', systems: ['Core'], acceptanceCriteria: ['Works'] }] });
  assert.equal(plan.title, 'Steal an Legacy');
  assert.ok(plan.coreLoop.length >= 4);
  assert.ok(plan.features.length >= 6);
  assert.equal(plan.phases.length, 10);
  assert.ok(plan.phases.every(phase => phase.systems.length && phase.acceptanceCriteria.length));
  assert.equal(plan.dataPersistence, true);
  assert.equal(plan.dataPersistenceStatus, 'planned');
  assert.ok(plan.qualityChecks.some(check => check.id === 'persistence' && check.passed));
});

test('explicitly false persistence choice is respected and source URLs are sanitized', () => {
  const plan = createProjectPlan({
    title: 'Tiny Obby', complexity: 'small', dataPersistence: false,
    sources: [
      { title: 'bad scheme', url: 'javascript:alert(1)' },
      { title: 'official', url: 'https://create.roblox.com/docs/studio/plugins' },
      { title: 'credential leak', url: 'https://user:pass@example.com/path' },
    ],
  });
  assert.equal(plan.dataPersistence, false);
  assert.equal(plan.sources.length, 1);
  assert.equal(plan.sources[0].official, true);
});

test('renders explicit quality checks', () => {
  const plan = createProjectPlan({ title: 'Dragon Isles', genre: 'Adventure RPG', coreLoop: ['Explore', 'Complete quests', 'Unlock zones'] });
  const markdown = renderProjectPlanMarkdown(plan);
  assert.match(markdown, /Reja sifati/);
  assert.match(markdown, /Gameplay loop aniq/);
});
