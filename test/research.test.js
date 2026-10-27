import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSearchResults, searchWeb } from '../src/research.js';

const html = `
<a class="result__a" href="https://example.com/game">Community game overview</a>
<a class="result__snippet" href="#">Community page describes general progression.</a>
<a class="result__a" href="https://create.roblox.com/docs/studio/plugins">Roblox Creator Hub plugins</a>
<a class="result__snippet" href="#">Official documentation for Studio plugin development.</a>
<a class="result__a" href="https://www.roblox.com/games/12345/sample">Sample Roblox experience</a>
<a class="result__snippet" href="#">Experience description and public game information.</a>
`;

test('parseSearchResults extracts links, snippets, and official domains safely', () => {
  const results = parseSearchResults(html, 'sample query');
  assert.equal(results.length, 3);
  assert.equal(results[0].title, 'Community game overview');
  assert.equal(results[0].official, false);
  assert.equal(results[1].official, true);
  assert.match(results[1].snippet, /Official documentation/);
  assert.equal(results[2].domain, 'roblox.com');
});

test('searchWeb prioritizes official results and honors officialOnly', async () => {
  const fetchImpl = async () => ({ ok:true, status:200, text:async()=>html });
  const all = await searchWeb({queries:['first query'],maxResults:3,fetchImpl});
  assert.equal(all.results[0].official,true);
  assert.equal(all.results.length,3);
  const official = await searchWeb({queries:['first query'],officialOnly:true,maxResults:3,fetchImpl});
  assert.equal(official.results.length,2);
  assert.ok(official.results.every(result=>result.official));
  assert.ok(official.searchedAt);
});

test('searchWeb reports empty queries without making a request', async () => {
  await assert.rejects(searchWeb({queries:['','  '],fetchImpl:async()=>{throw new Error('must not call');}}), /Kamida bitta/);
});
