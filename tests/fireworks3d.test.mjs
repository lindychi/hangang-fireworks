import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';
import * as music from '../app/music.ts';
import * as effects from '../app/effects.ts';

const code=ts.transpileModule(readFileSync(new URL('../app/fireworks3d.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function fixture(){
  let callback,scene,cancelled=false,disposed=false,time=0,level=0,band='bass';
  const listeners=new Set(),exports={};
  const events={addEventListener:k=>listeners.add(k),removeEventListener:k=>listeners.delete(k)};
  class Renderer{setPixelRatio(){}getPixelRatio(){return 1;}setSize(){}setClearColor(){}render(s){scene=s;}dispose(){disposed=true;}}
  const gradient={addColorStop(){}};
  vm.runInNewContext(code,{exports,require:name=>name==='three'?{...THREE,WebGLRenderer:Renderer}:name.includes('music')?music:effects,
    innerWidth:1440,innerHeight:900,devicePixelRatio:1,window:events,
    document:{createElement:()=>({getContext:()=>({createRadialGradient:()=>gradient,fillRect(){}})})},
    requestAnimationFrame:f=>{callback=f;return 1;},cancelAnimationFrame:()=>{cancelled=true;}});
  const engine={context:{state:'running',sampleRate:48000},analyser:{fftSize:1024,frequencyBinCount:512,
    getByteFrequencyData(bins){bins.fill(0);const [a,b]={bass:[1,6],mid:[6,47],treble:[47,240]}[band];bins.fill(level,a,b);},
    getByteTimeDomainData(wave){for(let i=0;i<wave.length;i++)wave[i]=128+Math.round(Math.sin(i*.2)*level*.4);}}};
  const settings={paused:false,connected:true,sound:false,intensity:1,musicPaused:false};
  const stop=exports.startFireworks3D(events,settings,()=>engine);
  function advance(frames){for(let i=0;i<frames;i++){time+=20;callback(time);}return scene.children.find(o=>o instanceof THREE.Points&&o.geometry.getAttribute('size'));}
  return {settings,engine,advance,setSignal(b,l){band=b;level=l;},stop,clean:()=>cancelled&&disposed&&listeners.size===0};
}
test('3D silence, stopped music, suspended context do not launch demo shells',()=>{
  const f=fixture();assert.equal(f.advance(100).geometry.drawRange.count,0);
  f.setSignal('bass',230);assert.ok(f.advance(30).geometry.drawRange.count>0);
  f.settings.musicPaused=true;assert.equal(f.advance(600).geometry.drawRange.count,0);
  f.settings.musicPaused=false;f.engine.context.state='suspended';assert.equal(f.advance(100).geometry.drawRange.count,0);
  f.stop();assert.ok(f.clean());
});
function performance(band){
  const f=fixture();f.setSignal(band,220);const p=f.advance(100),count=p.geometry.drawRange.count;
  const result={count,positions:Array.from(p.geometry.getAttribute('position').array.slice(0,count*3)),colors:Array.from(p.geometry.getAttribute('color').array.slice(0,count*3))};
  f.stop();return result;
}
test('3D actual particle geometry replays deterministically and differs across spectra',()=>{
  const bass=performance('bass');assert.ok(bass.count>0);
  assert.deepEqual(bass,performance('bass'));assert.notDeepEqual(bass,performance('treble'));
});
test('3D explicit music disconnect retains the existing demo fallback',()=>{
  const f=fixture();f.settings.connected=false;assert.ok(f.advance(100).geometry.drawRange.count>0);f.stop();assert.ok(f.clean());
});
