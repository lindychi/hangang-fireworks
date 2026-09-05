export type Settings = { paused: boolean; connected: boolean; intensity: number; sound: boolean };
export type SoundEngine = { context: AudioContext; analyser: AnalyserNode; source?: AudioNode; stream?: MediaStream; media?: MediaElementAudioSourceNode };
type Spark = { x:number; y:number; vx:number; vy:number; life:number; max:number; hue:number; size:number; willow:boolean };
type Rocket = { x:number; y:number; target:number; hue:number; power:number; kind:number };

export function startFireworks(el:HTMLCanvasElement, settings:Settings, getEngine:()=>SoundEngine|null) {
  const ctx=el.getContext('2d')!;
  const scene=document.createElement('canvas'), bg=scene.getContext('2d')!;
  let w=0,h=0,frame=0,last=0,lastLaunch=0,average=.1;
  let rockets:Rocket[]=[],sparks:Spark[]=[];
  const bins=new Uint8Array(512);
  const rand=(a:number,b:number)=>a+Math.random()*(b-a);
  let noise:AudioBuffer|undefined;
  const smoke:{x:number;y:number;life:number;hue:number}[]=[];
  let fanCount=0;
  function boom(power:number, x:number, crackle:boolean) {
    const e=getEngine(); if(!settings.sound || !e || e.context.state!=='running')return;
    const c=e.context;
    if(!noise){noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
    const source=c.createBufferSource();source.buffer=noise;
    const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=crackle?1800:420;
    const gain=c.createGain(),pan=c.createStereoPanner();pan.pan.value=(x/w-.5)*1.3;
    const t=c.currentTime+.24;
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.16*power,t+.015);gain.gain.exponentialRampToValueAtTime(.001,t+1.6);
    source.connect(filter).connect(gain).connect(pan).connect(c.destination);source.start(t);source.stop(t+1.7);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();pan.disconnect();};
  }
  function resize(){
    w=innerWidth;h=innerHeight;const dpr=Math.min(devicePixelRatio,2);el.width=w*dpr;el.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);scene.width=w;scene.height=h;
    const sky=bg.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#030711');sky.addColorStop(.5,'#141a32');sky.addColorStop(.73,'#292334');sky.addColorStop(1,'#03080d');bg.fillStyle=sky;bg.fillRect(0,0,w,h);
    for(let i=0;i<170;i++){bg.fillStyle=`rgba(207,220,242,${rand(.08,.65)})`;bg.beginPath();bg.arc(rand(0,w),rand(0,h*.62),rand(.3,1),0,Math.PI*2);bg.fill();}
    const moon=bg.createRadialGradient(w*.8,h*.16,0,w*.8,h*.16,60);moon.addColorStop(0,'#e7ddbd20');moon.addColorStop(1,'#e7ddbd00');bg.fillStyle=moon;bg.fillRect(w*.8-60,h*.16-60,120,120);
    bg.fillStyle='#e6dfc9';bg.beginPath();bg.arc(w*.8,h*.16,10,0,Math.PI*2);bg.fill();bg.fillStyle='#101524';bg.beginPath();bg.arc(w*.8+5,h*.16-4,9,0,Math.PI*2);bg.fill();
    const horizon=h*.75;
    for(let x=0;x<w;x+=15){const bh=rand(8,42);bg.fillStyle='#090f1b';bg.fillRect(x,horizon-bh,13,bh);for(let y=horizon-bh+5;y<horizon-3;y+=6){if(Math.random()>.4){bg.fillStyle='#b49b6850';bg.fillRect(x+4,y,2,2);}}}
    const bx=w*.7;bg.fillStyle='#393128';bg.fillRect(bx,horizon-h*.13,w*.026,h*.13);bg.fillStyle='#c9a36c80';for(let y=horizon-h*.13+4;y<horizon;y+=5)bg.fillRect(bx+3,y,Math.max(3,w*.026-6),1);
    bg.strokeStyle='#bfa77d70';bg.lineWidth=2;bg.beginPath();bg.moveTo(0,horizon-9);bg.lineTo(w*.47,horizon+5);bg.stroke();
    for(let x=20;x<w*.47;x+=58){bg.fillStyle='#141923';bg.fillRect(x,horizon-7+x/w*30,6,24);bg.fillStyle='#f6d79e';bg.fillRect(x,horizon-12+x/w*30,2,2);}
    const water=bg.createLinearGradient(0,horizon,0,h);water.addColorStop(0,'#0a101b');water.addColorStop(1,'#050b13');bg.fillStyle=water;bg.fillRect(0,horizon+10,w,h-horizon);
    for(let i=0;i<650;i++){bg.fillStyle=`rgba(160,167,181,${rand(.015,.09)})`;bg.fillRect(rand(0,w),rand(horizon+12,h*.96),rand(3,55),.7);}
  }
  function launch(power=1,x=rand(.16,.86)*w,y=rand(.13,.42)*h,kind=Math.floor(rand(0,4))){if(rockets.length>14)return;rockets.push({x,y:h*.75,target:y,hue:kind===1?40:[38,45,335,195,270][Math.floor(rand(0,5))],power,kind});}
  function fan(){
    const hue=fanCount++%2?36:335;
    for(let j=0;j<5;j++)for(let i=0;i<42;i++){
      const a=-Math.PI/2+(i/41-.5)*1.9,speed=rand(65,150)*Math.min(w/950,1.1),life=rand(.6,1.25);
      sparks.push({x:w*(.22+j*.14),y:h*.748,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life,max:life,hue: i%3===0?42:hue,size:1.2,willow:false});
    }
  }
  function burst(r:Rocket){
    smoke.push({x:r.x,y:r.y,life:4,hue:r.hue});if(smoke.length>18)smoke.shift();
    const count=Math.floor(145*r.power),willow=r.kind===1;
    for(let i=0;i<count;i++){const a=i/count*Math.PI*2;const speed=(r.kind===2?1:Math.pow(Math.random(),.4))*rand(70,150)*r.power*Math.min(w/950,1.15);const life=willow?rand(2.6,4.4):rand(1.3,2.8);sparks.push({x:r.x,y:r.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life,max:life,hue:r.hue+rand(-7,7),size:rand(.7,1.7),willow});}
    boom(r.power,r.x,r.kind===3);if(sparks.length>4200)sparks.splice(0,sparks.length-4200);
  }
  function draw(now:number){
    const dt=Math.min((now-last)/1000||.016,.04);last=now;ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.drawImage(scene,0,0,w,h);
    if(!settings.paused){
      const e=getEngine();
      if(settings.connected&&e){e.analyser.getByteFrequencyData(bins);let sum=0;for(let i=2;i<65;i++)sum+=bins[i];const energy=sum/63/255,beat=energy>Math.max(.13,average*1.18);average=average*.97+energy*.03;
        if(energy>.06&&now-lastLaunch>(beat?260:1400)/settings.intensity){launch((beat?1.05:.7)+energy*.6);lastLaunch=now;if(beat&&energy>.35)fan();if(beat&&energy>.48){launch(1.15,w*.25,h*.3,1);launch(1.15,w*.75,h*.3,1);}}}
      else if(now-lastLaunch>1200/settings.intensity){launch(rand(.8,1.4));lastLaunch=now;if(Math.random()>.72){fan();launch(.8,w*.3,h*.4,2);launch(.8,w*.7,h*.4,2);}}
      rockets.forEach(r=>{r.y-=310*dt;if(r.y<=r.target)burst(r);});rockets=rockets.filter(r=>r.y>r.target);
      sparks.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.986,dt*60);p.vy+= (p.willow?29:20)*dt;p.life-=dt;});sparks=sparks.filter(p=>p.life>0);smoke.forEach(p=>{p.life-=dt;p.x+=dt*5;});while(smoke.length&&smoke[0].life<=0)smoke.shift();
    }
    for(const p of smoke){const radius=(5-p.life)*40;const glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);glow.addColorStop(0,`hsla(${p.hue},20%,55%,${Math.max(0,p.life)*.012})`);glow.addColorStop(1,'#00000000');ctx.fillStyle=glow;ctx.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);}
    ctx.globalCompositeOperation='lighter';
    rockets.forEach(r=>{const trail=ctx.createLinearGradient(0,r.y,0,r.y+60);trail.addColorStop(0,'#ffdbb8');trail.addColorStop(1,'#ffbc7300');ctx.fillStyle=trail;ctx.fillRect(r.x,r.y,1.4,60);});
    sparks.forEach(p=>{let alpha=Math.min(1,p.life/p.max*1.5);if(p.willow&&p.life<1)alpha*=.55+.45*Math.sin(p.life*47+p.x);ctx.strokeStyle=`hsla(${p.hue},90%,72%,${alpha})`;ctx.lineWidth=p.size;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*(p.willow?.075:.035),p.y-p.vy*(p.willow?.075:.035));ctx.stroke();
      if(p.life>p.max*.86){ctx.fillStyle=`hsla(${p.hue},90%,80%,.055)`;ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.fill();}
      const ry=h*.763+(h*.75-p.y)*.3;if(ry<h*.98&&ry>h*.76){ctx.fillStyle=`hsla(${p.hue},85%,60%,${alpha*.17})`;ctx.fillRect(p.x+Math.sin(ry*.15+now*.001)*9,ry,11,1.1);}
    });
    ctx.globalCompositeOperation='source-over';ctx.fillStyle='#03070c';ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(0,h*.974);ctx.quadraticCurveTo(w*.5,h*.944,w,h*.969);ctx.lineTo(w,h);ctx.fill();
    ctx.strokeStyle='#0b1219';ctx.lineWidth=1;for(let i=0;i<90;i++){const x=i/90*w;ctx.beginPath();ctx.moveTo(x,h);ctx.quadraticCurveTo(x-5,h-22,x+Math.sin(i*7)*12,h-15-(i*13%25));ctx.stroke();}
    frame=requestAnimationFrame(draw);
  }
  const tap=(e:PointerEvent)=>{if(!settings.paused&&e.clientY<h*.72)launch(1.35,e.clientX,Math.max(50,e.clientY));};
  resize();launch(1.2,w*.45,h*.26,1);launch(1,w*.7,h*.35,2);frame=requestAnimationFrame(draw);window.addEventListener('resize',resize);el.addEventListener('pointerdown',tap);
  return ()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',resize);el.removeEventListener('pointerdown',tap);};
}
