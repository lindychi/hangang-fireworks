import test from 'node:test';
import assert from 'node:assert/strict';
import {createFireworkSound} from '../app/effects.ts';
function fixture(){
  const levels=[],sources=[],filters=[];
  const node=()=>({connect(n){return n;},disconnect(){this.disconnected=true;}});
  const context={state:'running',sampleRate:1000,currentTime:0,destination:node(),
    createBuffer:()=>({getChannelData:()=>new Float32Array(1000)}),
    createBufferSource(){const n={...node(),start(t){this.started=t;},stop(){this.stopped=true;}};sources.push(n);return n;},
    createBiquadFilter(){const n={...node(),frequency:{value:0},Q:{value:0}};filters.push(n);return n;},
    createGain:()=>({...node(),gain:{setValueAtTime(){},linearRampToValueAtTime(v){levels.push(v);},exponentialRampToValueAtTime(){}}}),
    createStereoPanner:()=>({...node(),pan:{value:0}})};
  const settings={sound:true,connected:true,paused:false};
  return {levels,sources,filters,settings,fx:createFireworkSound(settings,()=>({context}))};
}
test('launch and explosion have distinct short envelopes and spectral shapes',()=>{
  const {fx,sources,filters}=fixture();fx.play('launch',1,0);fx.play('burst',1,0,true);
  assert.equal(sources.length,2);assert.notEqual(filters[0].type,filters[1].type);
});
test('music accompaniment is ducked and concurrent events are bounded',()=>{
  const {fx,sources,levels}=fixture();for(let i=0;i<20;i++)fx.play('burst',2,0);
  assert.ok(sources.length<=6);assert.ok(Math.max(...levels)<=.04);
});
test('turning effects off cancels pending sounds and preserves the off preference',()=>{
  const {fx,settings,sources}=fixture();fx.play('burst',1,0);settings.sound=false;fx.sync();fx.play('launch',1,0);
  assert.equal(sources.length,1);assert.equal(sources[0].stopped,true);assert.equal(sources[0].disconnected,true);
  assert.equal(settings.sound,false);
});
test('cleanup stops and disconnects all scheduled sounds',()=>{
  const {fx,sources}=fixture();fx.play('launch',1,0);fx.play('burst',1,0);fx.dispose();
  assert.ok(sources.every(s=>s.stopped&&s.disconnected));
});
