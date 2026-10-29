import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldUseMultiAgent, runMultiAgentReview } from '../src/multi-agent.js';

test('Multi-Agent classifier skips casual chat and activates for complex Roblox work', () => {
  assert.equal(shouldUseMultiAgent('Salom'), false);
  assert.equal(shouldUseMultiAgent('Menga katta Roblox o‘yini yarat, tizimlarni bog‘la va xatolarni tuzat'), true);
  assert.equal(shouldUseMultiAgent('Please review security and test this feature'), true);
});

test('Multi-Agent review runs independent specialists and aggregates usage', async () => {
  const calls = [];
  const review = await runMultiAgentReview({
    messages: [{ role: 'user', content: [{ type: 'text', text: 'Katta Roblox o‘yini yarat va barcha xatolarni tuzat.' }] }],
    signal: new AbortController().signal,
    maxTokens: 700,
    credential: { provider: 'test', key: 'fake' },
    askAgent: async args => {
      calls.push(args.system);
      return {
        content: [{ type: 'text', text: 'Tekshiruv tavsiyasi.' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      };
    }
  });
  assert.equal(calls.length, 4);
  assert.equal(review.agentsCompleted, 4);
  assert.equal(review.inputTokens, 40);
  assert.equal(review.outputTokens, 20);
  assert.match(review.brief, /ARCHITECT/);
  assert.match(review.brief, /ROBLOX SECURITY/);
  assert.match(review.brief, /QA/);
  assert.match(review.brief, /CODE REVIEWER/);
});

test('Multi-Agent review degrades gracefully when a specialist fails', async () => {
  let calls = 0;
  const review = await runMultiAgentReview({
    messages: [{ role: 'user', content: [{ type: 'text', text: 'Fix this Roblox security issue and test it.' }] }],
    signal: new AbortController().signal,
    askAgent: async () => {
      calls++;
      if (calls === 1) throw new Error('provider unavailable');
      return { content: [{ type: 'text', text: 'Independent check.' }], usage: {} };
    }
  });
  assert.equal(review.agentsCompleted, 3);
});

test('Multi-Agent review does not call providers when aborted or not needed', async () => {
  let calls = 0;
  const askAgent = async () => { calls++; return { content: [{ type: 'text', text: 'unused' }] }; };
  assert.equal(await runMultiAgentReview({
    messages: [{ role: 'user', content: [{ type: 'text', text: 'Salom' }] }],
    signal: new AbortController().signal,
    askAgent
  }), null);
  const controller = new AbortController();
  controller.abort();
  assert.equal(await runMultiAgentReview({
    messages: [{ role: 'user', content: [{ type: 'text', text: 'Build a large Roblox game' }] }],
    signal: controller.signal,
    askAgent
  }), null);
  assert.equal(calls, 0);
});
