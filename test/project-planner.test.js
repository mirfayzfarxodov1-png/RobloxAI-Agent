import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectPlan, renderProjectPlanMarkdown } from '../src/project-planner.js';

test('creates a normalized project plan with sensible defaults', () => {
  const plan = createProjectPlan({ title: '  Sky Realm  ', genre: 'RPG', features: ['Quest', 'Quest', '', 'Inventory'] });
  assert.equal(plan.title, 'Sky Realm');
  assert.equal(plan.complexity, 'large');
  assert.deepEqual(plan.features, ['Quest', 'Inventory']);
  assert.ok(plan.phases.length >= 3);
  assert.equal(plan.schemaVersion, 1);
  assert.ok(plan.guardrails.length >= 4);
});

test('bounds untrusted input and drops malformed list values', () => {
  const plan = createProjectPlan({
    title: 'x'.repeat(200),
    features: Array.from({ length: 50 }, (_, i) => 'feature-' + i),
    constraints: [' safe ', null, 'safe'],
    complexity: 'impossible',
    phases: [{ name: 'phase', goal: 'g'.repeat(1000), systems: ['A', 'A', 'B'] }],
  });
  assert.equal(plan.title.length, 100);
  assert.equal(plan.features.length, 20);
  assert.deepEqual(plan.constraints, ['safe']);
  assert.equal(plan.complexity, 'large');
  assert.equal(plan.phases[0].goal.length, 500);
  assert.deepEqual(plan.phases[0].systems, ['A', 'B']);
});

test('renders a readable markdown plan with phase criteria', () => {
  const plan = createProjectPlan({
    title: 'Dragon Isles', genre: 'Adventure RPG', coreLoop: ['Explore', 'Complete quests'],
    phases: [{ name: 'Playable core', goal: 'Build the first quest', systems: ['QuestService'], acceptanceCriteria: ['Quest can be completed'] }],
  });
  const markdown = renderProjectPlanMarkdown(plan);
  assert.match(markdown, /# Dragon Isles/);
  assert.match(markdown, /Explore/);
  assert.match(markdown, /QuestService/);
  assert.match(markdown, /Quest can be completed/);
});
