import assert from 'node:assert/strict';
import {startFireworks} from '../app/fireworks.ts';
let callback,strokes=0,cancelled=false,now=0;
const listeners=new Map();
const gradient={addColorStop(){}};
const ctx=new Proxy({stroke(){strokes++;},createLinearGradient(){return gradient;},createRadialGradient(){return gradient;}},{get:(o,k)=>o[k]??(()=>{})});
const canvas={getContext:()=>ctx,addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:k=>listeners.delete(k)};
globalThis.document={createElement:()=>({...canvas})};globalThis.window={addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:k=>listeners.delete(k)};
globalThis.innerWidth=1440;globalThis.innerHeight=900;globalThis.devicePixelRatio=1;
globalThis.requestAnimationFrame=f=>{callback=f;return 1;};globalThis.cancelAnimationFrame=()=>{cancelled=true;};
let energy=0;const engine={analyser:{getByteFrequencyData:bins=>bins.fill(energy)}};
const settings={paused:false,connected:true,intensity:1,sound:false};
const stop=startFireworks(canvas,settings,()=>engine);
function advance(seconds){let total=0;for(let i=0;i<seconds*60;i++){strokes=0;now+=1000/60;callback(now);total+=strokes;}return total;}
advance(12);assert.equal(advance(2),90*120,'silence produces no new bursts');
energy=220;assert.ok(advance(3)>90*180,'audio energy produces visible bursts');
settings.paused=true;strokes=0;callback(now+=16);const frozen=strokes;strokes=0;callback(now+=16);assert.equal(strokes,frozen,'pause freezes particle count');
settings.paused=false;settings.connected=false;assert.ok(advance(6)>90*360,'demo continues without audio');
stop();assert.equal(cancelled,true);assert.equal(listeners.size,0);console.log('5 animation behavior checks passed');
