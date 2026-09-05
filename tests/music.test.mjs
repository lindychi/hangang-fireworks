import test from 'node:test';
import assert from 'node:assert/strict';
import {createMusicDirector} from '../app/music.ts';

function signal(band, level, rms = level / 255) {
  const bins = new Uint8Array(512);
  const ranges = {bass:[1,6],mid:[6,47],treble:[47,240],all:[1,240]};
  const [start,end] = ranges[band]; bins.fill(level,start,end);
  return {bins,rms,sampleRate:48000,fftSize:1024};
}
function song(band,level) {
  const director=createMusicDirector(), cues=[];
  for(let t=0;t<8000;t+=20) {
    const pulse=t%500<80;
    cues.push(...director.update(signal(band,pulse?level:level*.18),t,1));
  }
  return cues;
}
test('the same sampled song produces exactly the same choreography and seeds',()=>{
  assert.deepEqual(song('bass',220),song('bass',220));
  assert.ok(song('bass',220).length>0);
});
test('bass, midrange and treble produce different shapes, sizes and heights',()=>{
  const songs=['bass','mid','treble'].map(b=>song(b,220));
  assert.equal(new Set(songs.map(c=>c[0].kind)).size,3);
  assert.equal(new Set(songs.map(c=>c[0].height)).size,3);
  assert.equal(new Set(songs.map(c=>c[0].power)).size,3);
});
test('onsets trigger launches; sustained tones do not become repeated false beats',()=>{
  const director=createMusicDirector(),times=[];
  for(let t=0;t<4000;t+=20)if(director.update(signal('bass',200),t,1).length)times.push(t);
  assert.ok(times.length>=2 && times.length<=5,JSON.stringify(times));
  const pulseTimes=[];const beats=createMusicDirector();
  for(let t=0;t<4000;t+=20)if(beats.update(signal('bass',t%500<80?200:0),t,1).length)pulseTimes.push(t);
  assert.equal(pulseTimes.length,8);assert.ok(pulseTimes.every(t=>t%500===0));
});
test('silence and stopped input suppress launches even with stale smoothed FFT data',()=>{
  const director=createMusicDirector();director.update(signal('all',240),0,1);
  for(let t=20;t<6000;t+=20)assert.deepEqual(director.update(signal('all',240,0),t,1),[]);
  director.reset();assert.deepEqual(director.update(signal('all',0),10000,1),[]);
});
test('quiet to crescendo grows launch density, size and spread',()=>{
  const quiet=song('all',35),loud=song('all',240);
  assert.ok(quiet.length>0);assert.ok(loud.length>quiet.length*1.5);
  assert.ok(loud[0].power>quiet[0].power);
  assert.ok(new Set(loud.map(c=>c.x)).size>1);
});
test('frequency bands follow Hz when sample rate changes',()=>{
  const first=createMusicDirector().update(signal('bass',200),0,1)[0];
  const bins=new Uint8Array(1024);bins.fill(200,2,12);
  const second=createMusicDirector().update({bins,rms:200/255,sampleRate:48000,fftSize:2048},0,1)[0];
  assert.equal(first.kind,second.kind);
});
