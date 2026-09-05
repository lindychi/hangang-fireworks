import assert from 'node:assert/strict';
import test from 'node:test';
import {parseYouTube} from '../app/youtube.ts';
test('supports videos, live streams, playlists and music mixes',()=>{
  for(const url of ['https://youtu.be/nLZKpuCxmpM','https://www.youtube.com/live/nLZKpuCxmpM','https://www.youtube.com/watch?v=nLZKpuCxmpM','https://www.youtube.com/shorts/nLZKpuCxmpM'])assert.ok(parseYouTube(url).embed.includes('/nLZKpuCxmpM?'));
  assert.ok(parseYouTube('https://www.youtube.com/playlist?list=PL123456789').embed.includes('listType=playlist'));
  assert.ok(parseYouTube('https://music.youtube.com/watch?v=nLZKpuCxmpM&list=RDnLZKpuCxmpM').embed.includes('list=RDnLZKpuCxmpM'));
});
test('rejects non-video addresses and non-YouTube origins',()=>{
  for(const url of ['https://youtube.com.evil.com/watch?v=nLZKpuCxmpM','javascript:alert(1)','https://www.youtube.com/@Hanwha','https://www.youtube.com/watch?v=bad'])assert.throws(()=>parseYouTube(url));
});
