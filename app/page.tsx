"use client";
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {startFireworks,type SoundEngine} from './fireworks';
import {startFireworks3D} from './fireworks3d';
import {parseYouTube} from './youtube';

export default function Home(){
  const canvas=useRef<HTMLCanvasElement>(null),audio=useRef<HTMLAudioElement>(null);
  const engine=useRef<SoundEngine|null>(null),fileUrl=useRef('');
  const settings=useRef({paused:false,connected:false,intensity:1,sound:false});
  const [immersed,setImmersed]=useState(false),[paused,setPaused]=useState(false),[mode,setMode]=useState('demo');
  const [message,setMessage]=useState(''),[filename,setFilename]=useState(''),[busy,setBusy]=useState(false),[sound,setSound]=useState(false);
  const [youtube,setYoutube]=useState(''),[player,setPlayer]=useState<{embed:string;url:string}|null>(null);
  useEffect(()=>{
    settings.current.paused=window.matchMedia('(prefers-reduced-motion: reduce)').matches;setPaused(settings.current.paused);
    let stop:()=>void;
    try{stop=startFireworks3D(canvas.current!,settings.current,()=>engine.current);}
    catch{stop=startFireworks(canvas.current!,settings.current,()=>engine.current);setMessage('이 기기에서는 3D를 실행하지 못해 기본 불꽃 화면으로 열었어요.');}
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setImmersed(false);};window.addEventListener('keydown',key);
    return ()=>{stop();window.removeEventListener('keydown',key);const e=engine.current;engine.current=null;e?.stream?.getTracks().forEach(t=>t.stop());void e?.context.close();if(fileUrl.current)URL.revokeObjectURL(fileUrl.current);};
  },[]);
  async function prepare(){
    if(!engine.current){const context=new AudioContext(),analyser=context.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=.65;engine.current={context,analyser};}
    await engine.current.context.resume();return engine.current;
  }
  function disconnect(){
    settings.current.connected=false;const e=engine.current;
    if(e){e.source?.disconnect();e.source=undefined;const stream=e.stream;e.stream=undefined;stream?.getTracks().forEach(t=>t.stop());}
    audio.current?.pause();setMode('demo');
  }
  async function connectSound(){
    if(busy)return;
    if(!navigator.mediaDevices?.getDisplayMedia){setMessage('이 브라우저는 소리 공유를 지원하지 않아요. Chrome으로 열거나 음악 파일을 선택해 주세요.');return;}
    setBusy(true);setMessage('');let stream:MediaStream|undefined;
    try{
      stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});
      if(!stream.getAudioTracks().length){stream.getTracks().forEach(t=>t.stop());setMessage('소리가 공유되지 않았어요. 음악이 나오는 Chrome 탭을 고르고 ‘탭 오디오 공유’를 켜 주세요.');return;}
      const e=await prepare();disconnect();e.stream=stream;e.source=e.context.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));e.source.connect(e.analyser);settings.current.connected=true;setMode('shared');
      settings.current.sound=false;setSound(false);
      const current=stream;stream.getTracks().forEach(t=>t.addEventListener('ended',()=>{if(engine.current?.stream===current){disconnect();setMessage('소리 연결이 끝나 자동 불꽃으로 돌아왔어요.');}}));
    }catch(error){stream?.getTracks().forEach(t=>t.stop());setMessage(error instanceof DOMException&&error.name==='NotAllowedError'?'소리 공유가 취소되었거나 허용되지 않았어요. 다시 연결하거나 음악 파일을 골라 주세요.':'소리를 연결하지 못했어요. Chrome에서 다시 시도하거나 음악 파일을 골라 주세요.');}
    finally{setBusy(false);}
  }
  async function chooseFile(file?:File){
    if(!file)return;setBusy(true);
    try{const e=await prepare();disconnect();setPlayer(null);if(fileUrl.current)URL.revokeObjectURL(fileUrl.current);fileUrl.current=URL.createObjectURL(file);audio.current!.src=fileUrl.current;
      if(!e.media)e.media=e.context.createMediaElementSource(audio.current!);e.source=e.media;e.media.connect(e.analyser);e.media.connect(e.context.destination);
      setMode('file');setFilename(file.name);setMessage('');await audio.current!.play();settings.current.connected=true;
    }catch{disconnect();setMessage('이 음악 파일을 재생하지 못했어요. MP3 또는 WAV 파일로 다시 시도해 주세요.');}finally{setBusy(false);}
  }
  function loadYoutube(value=youtube){try{const next=parseYouTube(value);disconnect();setPlayer(next);setYoutube(value);setMessage('플레이어에서 재생을 누른 뒤, ‘소리 연결’에서 이 페이지 탭과 탭 오디오 공유를 선택하세요. 선택이 안 되면 ‘유튜브에서 열기’로 연 탭을 연결하세요.');}catch(error){setMessage((error as Error).message);}}
  function togglePause(){const next=!paused;setPaused(next);settings.current.paused=next;}
  async function toggleSound(){try{await prepare();settings.current.sound=!sound;setSound(!sound);}catch{setMessage('효과음을 켜지 못했어요. 다시 눌러 주세요.');}}
  async function fullscreen(){setImmersed(true);if(mode!=='shared'){void prepare().then(()=>{settings.current.sound=true;setSound(true);}).catch(()=>setMessage('소리를 켜지 못했어요. 효과음 버튼으로 다시 시도해 주세요.'));}try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen?.();}catch{setMessage('전체 화면을 열지 못했지만, 이 화면에서 계속 감상할 수 있어요.');}}
  return <main className={immersed?'immersed':''}>
    <canvas ref={canvas} aria-label="한강 둔치 1열에서 올려다보는 3D 불꽃축제. 드래그와 방향키로 시점 이동, R로 정면 복귀" />
    <header className="chrome"><Link className="brand" href="/">한강, 우리 둘<span>OUR OWN FIREWORKS</span></Link><span className="location"><i/> 여의도 · 우리만의 명당</span></header>
    <section className="invitation chrome"><p className="eyebrow">한강 둔치 1열 · 우리만을 위한 밤</p><h1>오늘은<br/>여기가 <em>명당.</em></h1><p className="letter">그날 다 못 본 하늘을, 오늘은 마음껏.<br/>좋아하는 노래 하나 틀고, 우리 여기 앉아 있자.</p><button className="primary" onClick={fullscreen}>여기 앉아 감상하기 <span>↗</span></button><p className="small">드래그로 둘러보기 · 하늘을 눌러 불꽃 쏘기 · R로 정면</p></section>
    <section className="music chrome" aria-label="음악과 불꽃 설정">
      <div className="music-top"><span>♪ &nbsp; 오늘 밤의 배경음악</span><span className="badge">{mode==='demo'?'자동 불꽃':'음악 연결됨'}</span></div>
      <p>당신의 노래에, 하늘이 반짝이도록.</p>
      <form onSubmit={e=>{e.preventDefault();loadYoutube();}}><label className="sr-only" htmlFor="youtube">유튜브 영상 또는 플레이리스트 주소</label><div className="url-row"><input id="youtube" type="url" placeholder="유튜브 · 플레이리스트 링크 붙여넣기" value={youtube} onChange={e=>setYoutube(e.target.value)} required/><button disabled={busy} type="submit">불러오기</button></div></form>
      <button className="live-link" onClick={()=>loadYoutube('https://www.youtube.com/watch?v=nLZKpuCxmpM')}>↗ 한화 2026 공식 중계 불러오기</button>
      <div className="music-actions"><button onClick={connectSound} disabled={busy}>{busy?'연결 중…':'소리 연결'} <span>↗</span></button><label className="file-button">음악 파일 선택<input type="file" accept="audio/*" disabled={busy} onChange={e=>{void chooseFile(e.target.files?.[0]);e.target.value='';}}/></label></div>
      <p className="hint">음악이 나오는 Chrome 탭 + ‘탭 오디오 공유’를 선택하세요.<br/>파일은 내 기기에서만 재생돼요. 공유한 화면은 저장하지 않아요.</p>
      <audio ref={audio} controls hidden={mode!=='file'} onEnded={()=>{if(engine.current?.source===engine.current?.media)settings.current.connected=false;}} onPlay={()=>{if(engine.current?.source===engine.current?.media)settings.current.connected=true;}} onPause={()=>{if(engine.current?.source===engine.current?.media)settings.current.connected=false;}} onError={()=>{if(mode==='file'){disconnect();setMessage('지원되지 않거나 손상된 음악 파일이에요. 다른 파일을 선택해 주세요.');}}}/>
      {mode==='file'&&<p className="filename">{filename}</p>}
      {mode!=='demo'&&<button className="text-button" onClick={disconnect}>음악 연결 해제</button>}
      <div className="settings"><label htmlFor="intensity">불꽃 풍성함</label><input id="intensity" type="range" min="0.5" max="2" step="0.1" defaultValue="1" onChange={e=>{settings.current.intensity=Number(e.target.value);}}/><button onClick={togglePause}>{paused?'불꽃 재개':'잠시 멈춤'}</button></div>
      <div className="sound-row"><button onClick={toggleSound} aria-pressed={sound}>효과음 {sound?'켜짐':'꺼짐'}</button><span>직접 만든 불꽃 소리 · 중계 연결 시 기본 꺼짐</span></div>
    </section>
    {player&&<aside className="youtube-player" aria-label="유튜브 플레이어"><div><span>오늘의 플레이리스트</span><a href={player.url} target="_blank" rel="noreferrer">유튜브에서 열기 ↗</a><button aria-label="유튜브 재생 종료" onClick={()=>{setPlayer(null);if(mode==='shared')disconnect();}}>×</button></div><iframe src={player.embed} title="유튜브 음악 또는 불꽃축제 중계" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/><p>재생 불가 영상·비공개 목록은 유튜브에서 열어 연결하세요.</p></aside>}
    {message&&<div className="notice" role="status">{message}<button onClick={()=>setMessage('')} aria-label="안내 닫기">×</button></div>}
    <footer className="chrome"><span>좋은 자리는, 함께 앉은 자리니까.</span><span>SEOUL · HANGANG · JUST US</span></footer>
    {immersed&&<div className="immersive-controls"><button onClick={togglePause}>{paused?'불꽃 재개':'잠시 멈춤'}</button><button onClick={()=>{setImmersed(false);if(document.fullscreenElement)void document.exitFullscreen();}}>설정 보기 · Esc</button><span>드래그 · 방향키로 둘러보기 / R 정면</span></div>}
  </main>;
}
