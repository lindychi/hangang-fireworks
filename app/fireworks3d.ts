import * as THREE from 'three';
import type { Settings, SoundEngine } from './fireworks';

type Ember = { p:THREE.Vector3; v:THREE.Vector3; color:THREE.Color; life:number; max:number; size:number; trail:THREE.Vector3[]; willow:boolean };
type Shell = { p:THREE.Vector3; target:THREE.Vector3; color:THREE.Color; kind:number; power:number };

export function startFireworks3D(canvas:HTMLCanvasElement,settings:Settings,getEngine:()=>SoundEngine|null){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.setClearColor('#040810');
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#08101b',.0015);
  const camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.1,1800);
  camera.position.set(0,1.15,18);camera.rotation.order='YXZ';
  let yaw=0,pitch=.20,targetYaw=0,targetPitch=.20,drag=false,lastX=0,lastY=0,travel=0;
  scene.add(new THREE.HemisphereLight('#7891b3','#10160f',.65));
  const moonLight=new THREE.DirectionalLight('#7b92b7',.65);moonLight.position.set(40,90,-160);scene.add(moonLight);
  const rand=(a:number,b:number)=>a+Math.random()*(b-a);
  function box(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:string){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),new THREE.MeshStandardMaterial({color,roughness:.9}));m.position.set(x,y,z);scene.add(m);return m;}
  // A seated eye line, a narrow bank and a blanket place the viewer at the water's edge.
  box(0,-.45,22,400,.8,28,'#101811');
  box(0,-.015,17.8,2.2,.04,2.1,'#423b36');
  for(let i=0;i<7;i++)box(-1.05+i*.35,.009,17.8,.035,.006,2.1,'#756653');
  box(1.25,.16,16.8,.13,.32,.13,'#908774');
  box(-1.25,.02,15.3,5,.08,.22,'#292b29');
  // Grass blades are real geometry, with parallax when looking around.
  const grassPositions:number[]=[];
  for(let i=0;i<1300;i++){const x=rand(-45,45),z=rand(8.6,14.4),height=rand(.08,.4);grassPositions.push(x,0,z,x+rand(-.1,.1),height,z+rand(-.06,.06));}
  const grassGeo=new THREE.BufferGeometry();grassGeo.setAttribute('position',new THREE.Float32BufferAttribute(grassPositions,3));scene.add(new THREE.LineSegments(grassGeo,new THREE.LineBasicMaterial({color:'#253329'})));
  // The distant opposite bank and city provide scale for the enormous shells.
  box(0,-1,-330,1000,2,40,'#0a1019');
  const windowPositions:number[]=[];
  for(let i=0;i<85;i++){
    const x=(i-42)*10,bh=rand(5,24),z=rand(-365,-335);box(x,bh/2,z,rand(5,9),bh,8,'#111a26');
    for(let y=2;y<bh;y+=2)for(let xx=-2;xx<=2;xx+=2)if(Math.random()>.28)windowPositions.push(x+xx,y,z+4.1);
  }
  box(135,30,-338,13,60,13,'#4a3d2a');
  for(let y=2;y<59;y+=1.4)for(let x=130;x<=140;x+=2)windowPositions.push(x,y,-331.4);
  const windowsGeo=new THREE.BufferGeometry();windowsGeo.setAttribute('position',new THREE.Float32BufferAttribute(windowPositions,3));scene.add(new THREE.Points(windowsGeo,new THREE.PointsMaterial({color:'#e2bf7a',size:.65,transparent:true,opacity:.7})));
  box(-170,7,-185,245,1.2,10,'#25303d');
  for(let x=-290;x<-45;x+=24){box(x,2.7,-185,2,7,4,'#19202b');const bulb=new THREE.Mesh(new THREE.SphereGeometry(.5,6,6),new THREE.MeshBasicMaterial({color:'#ffcd83'}));bulb.position.set(x,9,-179);scene.add(bulb);}
  for(let x=-65;x<=65;x+=32)box(x,.55,-125,15,1.1,5,'#121c24');
  const stars=new Float32Array(1500*3);
  for(let i=0;i<1500;i++){const a=rand(-Math.PI,Math.PI),el=rand(.04,1.4),r=1000;stars.set([Math.sin(a)*Math.cos(el)*r,Math.sin(el)*r,Math.cos(a)*Math.cos(el)*r],i*3);}
  const starsGeo=new THREE.BufferGeometry();starsGeo.setAttribute('position',new THREE.BufferAttribute(stars,3));scene.add(new THREE.Points(starsGeo,new THREE.PointsMaterial({color:'#c5d4eb',size:1.1,transparent:true,opacity:.55,fog:false})));
  const moon=new THREE.Mesh(new THREE.SphereGeometry(3,24,16),new THREE.MeshBasicMaterial({color:'#e0dfcf',fog:false}));moon.position.set(160,210,-700);scene.add(moon);
  const smokeCanvas=document.createElement('canvas');smokeCanvas.width=64;smokeCanvas.height=64;
  const smokeContext=smokeCanvas.getContext('2d')!;const smokeGradient=smokeContext.createRadialGradient(32,32,1,32,32,32);smokeGradient.addColorStop(0,'#ffffff');smokeGradient.addColorStop(.4,'#ffffff66');smokeGradient.addColorStop(1,'#ffffff00');smokeContext.fillStyle=smokeGradient;smokeContext.fillRect(0,0,64,64);
  const smokeTexture=new THREE.CanvasTexture(smokeCanvas);const smoke:{sprite:THREE.Sprite;life:number}[]=[];
  const flashes=Array.from({length:8},()=>new THREE.Vector4(0,0,0,0));
  const flashColors=Array.from({length:8},()=>new THREE.Color());
  const waterMaterial=new THREE.ShaderMaterial({transparent:false,uniforms:{time:{value:0},flashes:{value:flashes},flashColors:{value:flashColors}},vertexShader:`varying vec3 world; void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`
    uniform float time;uniform vec4 flashes[8];uniform vec3 flashColors[8];varying vec3 world;
    void main(){vec2 p=world.xz;float wave=sin(p.x*.85+p.y*.75+time*1.1)*.5+sin(p.y*2.8-time*1.7)*.3+sin(p.x*3.+p.y*.3+time)*.2;
      vec3 col=vec3(.009,.018,.03)+vec3(.012,.02,.032)*max(0.,wave);vec3 view=normalize(cameraPosition-world);vec3 normal=normalize(vec3(sin(p.x*.85+time)*.07,1.,cos(p.y*.7-time)*.13));
      for(int i=0;i<8;i++){vec3 source=flashes[i].xyz;vec3 light=normalize(source-world);vec3 halfway=normalize(light+view);float spec=pow(max(dot(normal,halfway),0.),38.);float band=exp(-pow((p.x-source.x)/(6.+abs(p.y-source.z)*.15),2.));float reach=smoothstep(source.z-15.,source.z+25.,p.y);col+=flashColors[i]*flashes[i].w*reach*(spec*1.8+band*(.025+max(0.,wave)*.07));}
      float haze=smoothstep(100.,450.,length(p-cameraPosition.xz));gl_FragColor=vec4(mix(col,vec3(.021,.033,.049),haze*.55),1.);
    }`});
  const water=new THREE.Mesh(new THREE.PlaneGeometry(1100,420),waterMaterial);water.rotation.x=-Math.PI/2;water.position.set(0,-.06,-198);scene.add(water);
  const capacity=22000,positions=new Float32Array(capacity*3),colors=new Float32Array(capacity*3),sizes=new Float32Array(capacity);
  const particlesGeo=new THREE.BufferGeometry();particlesGeo.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));particlesGeo.setAttribute('color',new THREE.BufferAttribute(colors,3).setUsage(THREE.DynamicDrawUsage));particlesGeo.setAttribute('size',new THREE.BufferAttribute(sizes,1).setUsage(THREE.DynamicDrawUsage));
  const particleMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexColors:true,uniforms:{pixelRatio:{value:renderer.getPixelRatio()}},vertexShader:`attribute float size; uniform float pixelRatio; varying vec3 tint; void main(){tint=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(size*480.*pixelRatio/-mv.z,1.,55.);gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying vec3 tint;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float a=exp(-d*d*6.);gl_FragColor=vec4(tint*(1.+exp(-d*d*35.)*1.2),a);}`});
  const particles=new THREE.Points(particlesGeo,particleMaterial);particles.frustumCulled=false;scene.add(particles);
  const light=new THREE.PointLight('#ffd3a1',0,220,1);scene.add(light);
  let embers:Ember[]=[],shells:Shell[]=[],frame=0,last=0,time=0,lastLaunch=0,average=.1,flashIndex=0,frameCounter=0;
  const bins=new Uint8Array(512);let noise:AudioBuffer|undefined;
  const audioNodes=new Set<AudioScheduledSourceNode>();
  function boom(at:THREE.Vector3,power:number,crackle:boolean){
    const e=getEngine();if(!settings.sound||!e||e.context.state!=='running')return;const c=e.context;
    if(!noise){noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
    const distance=camera.position.distanceTo(at),t=c.currentTime+distance/343;
    const src=c.createBufferSource();src.buffer=noise;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=crackle?1400:400;
    const gain=c.createGain(),pan=c.createStereoPanner();pan.pan.value=THREE.MathUtils.clamp(at.x/150+Math.sin(yaw),-1,1);
    gain.gain.setValueAtTime(.001,t);gain.gain.linearRampToValueAtTime(.20*power*Math.min(1,140/distance),t+.018);gain.gain.exponentialRampToValueAtTime(.001,t+1.8);
    src.connect(filter).connect(gain).connect(pan).connect(c.destination);src.start(t);src.stop(t+1.9);audioNodes.add(src);src.onended=()=>{audioNodes.delete(src);src.disconnect();filter.disconnect();gain.disconnect();pan.disconnect();};
    const bass=c.createOscillator(),bassGain=c.createGain();bass.frequency.setValueAtTime(65,t);bass.frequency.exponentialRampToValueAtTime(24,t+.5);bassGain.gain.setValueAtTime(.09*power,t);bassGain.gain.exponentialRampToValueAtTime(.001,t+.7);bass.connect(bassGain).connect(c.destination);bass.start(t);bass.stop(t+.72);audioNodes.add(bass);bass.onended=()=>{audioNodes.delete(bass);bass.disconnect();bassGain.disconnect();};
  }
  function launch(power=1,x=rand(-80,80),height=rand(55,110),z=rand(-170,-80),kind=Math.floor(rand(0,4))){
    if(shells.length>12)return;const color=new THREE.Color().setHSL((kind===1?42:[35,44,335,195,275][Math.floor(rand(0,5))])/360,.85,.64);shells.push({p:new THREE.Vector3(x*.6,1,z),target:new THREE.Vector3(x,height,z),color,kind,power});
  }
  function burst(shell:Shell){
    const count=Math.floor(260*shell.power),willow=shell.kind===1;
    for(let i=0;i<count;i++){
      const theta=rand(0,Math.PI*2),cos=rand(-1,1),sin=Math.sqrt(1-cos*cos);const speed=rand(13,31)*shell.power;
      const v=shell.kind===2?new THREE.Vector3(Math.cos(theta)*speed,Math.sin(theta)*speed,rand(-1,1)):new THREE.Vector3(Math.cos(theta)*sin*speed,cos*speed,Math.sin(theta)*sin*speed);
      const life=willow?rand(3.2,5):rand(1.6,3.2);embers.push({p:shell.p.clone(),v,color:shell.color,life,max:life,size:rand(.35,.8),trail:[],willow});
    }
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:smokeTexture,color:shell.color.clone().lerp(new THREE.Color('#718091'),.8),transparent:true,opacity:.12,depthWrite:false}));sprite.position.copy(shell.p);sprite.scale.set(18,18,1);scene.add(sprite);smoke.push({sprite,life:5});
    if(smoke.length>16){const old=smoke.shift()!;scene.remove(old.sprite);old.sprite.material.dispose();}
    const index=flashIndex++%8;flashes[index].set(shell.p.x,shell.p.y,shell.p.z,shell.power*1.8);flashColors[index].copy(shell.color);
    light.position.copy(shell.p);light.color.copy(shell.color);light.intensity=500*shell.power;boom(shell.p,shell.power,shell.kind===3);
  }
  function fan(){for(let x=-64;x<=64;x+=32)for(let i=0;i<35;i++){const a=-Math.PI/2+(i/34-.5)*1.6;const life=rand(.8,1.5);embers.push({p:new THREE.Vector3(x,1,-125),v:new THREE.Vector3(Math.cos(a)*25,-Math.sin(a)*25,rand(-3,3)),color:new THREE.Color('#ffc478'),life,max:life,size:.35,trail:[],willow:false});}}
  function write(p:THREE.Vector3,color:THREE.Color,alpha:number,size:number,n:number){positions.set([p.x,p.y,p.z],n*3);colors.set([color.r*alpha,color.g*alpha,color.b*alpha],n*3);sizes[n]=size;}
  function render(now:number){
    const dt=Math.min((now-last)/1000||.016,.04);last=now;
    if(!settings.paused){time+=dt;frameCounter++;
      const e=getEngine();if(settings.connected&&e){e.analyser.getByteFrequencyData(bins);let sum=0;for(let i=2;i<65;i++)sum+=bins[i];const energy=sum/63/255,beat=energy>Math.max(.13,average*1.18);average=average*.97+energy*.03;
        if(energy>.06&&time-lastLaunch>(beat?.25:1.4)/settings.intensity){launch(.8+energy);lastLaunch=time;if(beat&&energy>.4)fan();}}
      else if(time-lastLaunch>1.35/settings.intensity){launch(rand(.8,1.4));lastLaunch=time;if(Math.random()>.6){launch(1,-55,70,-130,1);launch(1,55,70,-130,1);fan();}}
      for(const s of shells){const delta=s.target.clone().sub(s.p),distance=delta.length();s.p.addScaledVector(delta.normalize(),Math.min(distance,85*dt));if(distance<85*dt+1)burst(s);}
      shells=shells.filter(s=>s.p.distanceTo(s.target)>1);
      for(const p of embers){if(frameCounter%2===0){p.trail.unshift(p.p.clone());if(p.trail.length>(p.willow?9:5))p.trail.pop();}p.p.addScaledVector(p.v,dt);p.v.multiplyScalar(Math.pow(.975,dt*60));p.v.y-= (p.willow?5.2:3.8)*dt;p.life-=dt;}
      embers=embers.filter(p=>p.life>0&&p.p.y>0);if(embers.length>2700)embers.splice(0,embers.length-2700);
      for(let i=smoke.length-1;i>=0;i--){const p=smoke[i];p.life-=dt;p.sprite.position.x+=dt*2;p.sprite.position.y+=dt*.7;p.sprite.scale.x+=dt*5;p.sprite.scale.y+=dt*4;p.sprite.material.opacity=Math.max(0,p.life)*.02;if(p.life<=0){scene.remove(p.sprite);p.sprite.material.dispose();smoke.splice(i,1);}}
      flashes.forEach(f=>{f.w*=Math.pow(.975,dt*60);});light.intensity*=Math.pow(.90,dt*60);
    }
    let count=0;
    for(const p of embers){const alpha=Math.min(1,p.life/p.max*1.4)*(p.willow&&p.life<1?.65+.35*Math.sin(p.life*50):1);if(count>=capacity-12)break;write(p.p,p.color,alpha,p.size,count++);p.trail.forEach((pos,i)=>write(pos,p.color,alpha*(1-i/(p.trail.length+1))*.42,p.size*.65,count++));}
    for(const s of shells)for(let i=0;i<10;i++){if(count>=capacity)break;write(new THREE.Vector3(s.p.x,s.p.y-i*.65,s.p.z),s.color,(1-i/10)*.8,.35,count++);}
    particlesGeo.setDrawRange(0,count);for(const key of ['position','color','size'])particlesGeo.getAttribute(key).needsUpdate=true;
    yaw+=(targetYaw-yaw)*.09;pitch+=(targetPitch-pitch)*.09;camera.rotation.set(pitch,yaw,0,'YXZ');
    waterMaterial.uniforms.time.value=time;renderer.render(scene,camera);frame=requestAnimationFrame(render);
  }
  const down=(e:PointerEvent)=>{drag=true;travel=0;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);};
  const move=(e:PointerEvent)=>{if(!drag)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;travel+=Math.abs(dx)+Math.abs(dy);targetYaw=THREE.MathUtils.clamp(targetYaw-dx*.002,-1.1,1.1);targetPitch=THREE.MathUtils.clamp(targetPitch-dy*.002,-.2,1.1);lastX=e.clientX;lastY=e.clientY;};
  const up=(e:PointerEvent)=>{if(drag&&travel<8&&!settings.paused){const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),camera);const target=ray.ray.at(140,new THREE.Vector3());launch(1.3,target.x,THREE.MathUtils.clamp(target.y,20,140),target.z,1);}drag=false;};
  const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement)?.matches('input,textarea,button'))return;let handled=true;if(e.key==='ArrowLeft')targetYaw+=.08;else if(e.key==='ArrowRight')targetYaw-=.08;else if(e.key==='ArrowUp')targetPitch+=.06;else if(e.key==='ArrowDown')targetPitch-=.06;else if(e.key.toLowerCase()==='r'){targetYaw=0;targetPitch=.2;}else handled=false;if(handled){e.preventDefault();targetYaw=THREE.MathUtils.clamp(targetYaw,-1.1,1.1);targetPitch=THREE.MathUtils.clamp(targetPitch,-.2,1.1);}};
  const resize=()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);window.addEventListener('keydown',key);window.addEventListener('resize',resize);
  launch(1.4,25,75,-110,1);launch(1,-55,62,-150,2);frame=requestAnimationFrame(render);
  return ()=>{cancelAnimationFrame(frame);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);window.removeEventListener('keydown',key);window.removeEventListener('resize',resize);audioNodes.forEach(s=>{s.onended=null;s.stop();s.disconnect();});scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Points||o instanceof THREE.LineSegments){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.dispose());}});smoke.forEach(p=>p.sprite.material.dispose());smokeTexture.dispose();renderer.dispose();};
}
