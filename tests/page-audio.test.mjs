import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

function page(){
  const refs=[], exports={};
  const react={useRef(value){const ref={current:value};refs.push(ref);return ref;},useState:value=>[value,()=>{}],useEffect(){}};
  const code=ts.transpileModule(readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(code,{exports,require:name=>name==='react'?react:name==='react/jsx-runtime'?jsx:{},document:{documentElement:{requestFullscreen:async()=>{}}}});
  const tree=exports.default(),nodes=[];
  function walk(node){if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(walk);return;}nodes.push(node);walk(node.props?.children);}
  walk(tree);
  const media={};refs[2].current={source:media,media};
  return {audio:nodes.find(n=>n.type==='audio'),settings:refs[4].current,entry:nodes.find(n=>n.type==='button'&&n.props.className==='primary')};
}
test('file pause and end keep music connected but suppress music launches; play resumes',()=>{
  const {audio,settings}=page();audio.props.onPlay();assert.equal(settings.connected,true);
  audio.props.onPause();assert.equal(settings.connected,true);assert.equal(settings.musicPaused,true);
  audio.props.onPlay();assert.equal(settings.musicPaused,false);
  audio.props.onEnded();assert.equal(settings.connected,true);assert.equal(settings.musicPaused,true);
});
test('entering immersive mode preserves the user effects-off choice',async()=>{
  const {entry,settings}=page();settings.sound=false;await entry.props.onClick();assert.equal(settings.sound,false);
});
