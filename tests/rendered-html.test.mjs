import assert from 'node:assert/strict';
import test from 'node:test';

test('serves the Korean fireworks experience with working entry points',async()=>{
  const {default:worker}=await import('../dist/server/index.js');
  const response=await worker.fetch(new Request('http://localhost/',{headers:{accept:'text/html'}}),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});
  assert.equal(response.status,200);
  const html=await response.text();
  for(const text of ['한강, 우리 둘','명당','유튜브','플레이리스트','소리 연결','음악 파일 선택','여기 앉아 감상하기'])assert.ok(html.includes(text),text);
  assert.match(html,/<html[^>]*lang="ko"/);
  assert.match(html,/<canvas/);
  assert.doesNotMatch(html,/codex-preview|react-loading-skeleton|Starter Project/);
});
