import { clamp, game } from './core.js';
import { coastQuery, profileTotal } from './coast.js';

// ------------------------------ audio ----------------------------------
let actx=null,musicBus,sfxBus,noiseBuf,waveG=null;
const AC_=window.AudioContext||window.webkitAudioContext;
export function initAudio(){
  if(actx)return;actx=new AC_();if(actx.state==='suspended')actx.resume();
  musicBus=actx.createGain();musicBus.gain.value=0.16;
  const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2200;
  musicBus.connect(lp);lp.connect(actx.destination);
  sfxBus=actx.createGain();sfxBus.gain.value=0.85;sfxBus.connect(actx.destination);
  noiseBuf=actx.createBuffer(1,actx.sampleRate,actx.sampleRate);
  const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  const ws=actx.createBufferSource();ws.buffer=noiseBuf;ws.loop=true;
  const wf=actx.createBiquadFilter();wf.type='lowpass';wf.frequency.value=480;
  waveG=actx.createGain();waveG.gain.value=0;
  ws.connect(wf);wf.connect(waveG);waveG.connect(sfxBus);ws.start();
  startMusic();
}
const mf=m=>440*Math.pow(2,(m-69)/12);
// --- pack audio access: raw nodes + helpers so content packs can synth their
// own SFX without editing this file. actx is null until initAudio() has run.
export function getAudioCtx(){return{actx,sfxBus,musicBus,noiseBuf,mf,noiseHit};}
const CHORDS=[[60,64,67,71],[57,60,64,67],[53,57,60,65],[55,59,62,67]];
const BASS=[48,45,41,43];
const PENT=[72,74,76,79,81,84];
const HB=60/72/2;
function pad(m,t,dur){
  for(const det of[-4,3]){
    const o=actx.createOscillator(),g=actx.createGain();
    o.type='triangle';o.frequency.value=mf(m);o.detune.value=det;
    g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.045,t+1.1);
    g.gain.setValueAtTime(0.045,t+dur-1.3);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g);g.connect(musicBus);o.start(t);o.stop(t+dur+0.1);
  }
}
function pluck(m,t){
  const o=actx.createOscillator(),g=actx.createGain();
  o.type='triangle';o.frequency.value=mf(m);
  g.gain.setValueAtTime(0.15,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.9);
  o.connect(g);g.connect(musicBus);o.start(t);o.stop(t+1);
}
function bassN(m,t){
  const o=actx.createOscillator(),g=actx.createGain();
  o.type='sine';o.frequency.value=mf(m);
  g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.11,t+0.05);
  g.gain.exponentialRampToValueAtTime(0.0001,t+HB*4);
  o.connect(g);g.connect(musicBus);o.start(t);o.stop(t+HB*4+0.1);
}
let musT=0,hb=0;
function startMusic(){
  musT=actx.currentTime+0.1;
  setInterval(()=>{
    while(musT<actx.currentTime+0.6){
      const bar=Math.floor(hb/16)%4;
      if(hb%16===0){pad(CHORDS[bar][0],musT,HB*16);pad(CHORDS[bar][1],musT,HB*16);pad(CHORDS[bar][2],musT,HB*16);pad(CHORDS[bar][3]+12,musT,HB*16);bassN(BASS[bar],musT)}
      if(hb%16===8)bassN(BASS[bar],musT);
      if(hb%2===1&&Math.random()<0.42)pluck(PENT[Math.random()*PENT.length|0],musT+Math.random()*0.04);
      musT+=HB;hb++;
    }
  },200);
}
function noiseHit(t,dur,type,freq,q,peak){
  const src=actx.createBufferSource();src.buffer=noiseBuf;
  const f=actx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;
  const g=actx.createGain();
  g.gain.setValueAtTime(peak,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  src.connect(f);f.connect(g);g.connect(sfxBus);src.start(t);src.stop(t+dur+0.05);
}
export function sBoom(){if(!actx)return;const t=actx.currentTime;
  noiseHit(t,0.9,'lowpass',140,0.7,0.9);
  const o=actx.createOscillator(),g=actx.createGain();
  o.type='sine';o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(38,t+0.7);
  g.gain.setValueAtTime(0.5,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.8);
  o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+0.85);
}
export function sLaunch(){if(!actx)return;const t=actx.currentTime;
  noiseHit(t,0.45,'bandpass',900,1.5,0.18);
  const o=actx.createOscillator(),g=actx.createGain();
  o.type='sine';o.frequency.setValueAtTime(300,t);o.frequency.exponentialRampToValueAtTime(1300,t+0.5);
  g.gain.setValueAtTime(0.06,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.55);
  o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+0.6);
}
export function sCrackleBurst(){if(!actx)return;const t=actx.currentTime;
  for(let i=0;i<14;i++)noiseHit(t+Math.random()*1.2,0.05,'highpass',3000,1,0.12);
}
export function sPop(){if(!actx)return;noiseHit(actx.currentTime,0.12,'bandpass',1400,2,0.25)}
export function sChime(){if(!actx)return;const t=actx.currentTime;
  [523.25,659.25].forEach((f,i)=>{
    const o=actx.createOscillator(),g=actx.createGain();
    o.type='sine';o.frequency.value=f;
    g.gain.setValueAtTime(0.0001,t+i*0.12);g.gain.linearRampToValueAtTime(0.12,t+i*0.12+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,t+i*0.12+1.1);
    o.connect(g);g.connect(sfxBus);o.start(t+i*0.12);o.stop(t+i*0.12+1.2);
  });
}
export function sStep(surf){if(!actx)return;const t=actx.currentTime;
  if(surf==='wood')noiseHit(t,0.09,'bandpass',320,1.2,0.16);
  else if(surf==='stone')noiseHit(t,0.07,'bandpass',950,1.5,0.13);
  else noiseHit(t,0.08,'lowpass',480,0.8,0.1);
}
function sGull(){if(!actx)return;const t=actx.currentTime;
  for(let i=0;i<2;i++){
    const o=actx.createOscillator(),g=actx.createGain();
    o.type='sine';const t0=t+i*0.28;
    o.frequency.setValueAtTime(1150,t0);o.frequency.exponentialRampToValueAtTime(760,t0+0.22);
    g.gain.setValueAtTime(0.0001,t0);g.gain.linearRampToValueAtTime(0.055,t0+0.03);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+0.26);
    o.connect(g);g.connect(sfxBus);o.start(t0);o.stop(t0+0.3);
  }
}
function sCricket(){if(!actx)return;const t=actx.currentTime;
  for(let i=0;i<3;i++){
    const o=actx.createOscillator(),g=actx.createGain();
    o.type='sine';o.frequency.value=4200;const t0=t+i*0.09;
    g.gain.setValueAtTime(0.0001,t0);g.gain.linearRampToValueAtTime(0.03,t0+0.015);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+0.07);
    o.connect(g);g.connect(sfxBus);o.start(t0);o.stop(t0+0.09);
  }
}
// --- beauty-pass ambience: halyards / wind gusts / birdsong / rock wavelets.
// vol (0..1) is a distance scale computed by the scheduler; keep peaks LOW so
// these sit under the music and waves. fire-and-forget nodes, all guard actx.
function sHalyard(vol){if(!actx)return;const t=actx.currentTime;
  const hits=Math.random()<0.35?2:1;
  for(let i=0;i<hits;i++){
    const o=actx.createOscillator(),g=actx.createGain();
    o.type=Math.random()<0.5?'sine':'triangle';
    o.frequency.value=2500+Math.random()*2000;   // 2.5–4.5 kHz
    o.detune.value=(Math.random()*2-1)*18;        // tiny random detune
    const t0=t+i*0.08,dur=0.06+Math.random()*0.06;
    g.gain.setValueAtTime(vol*(0.05+Math.random()*0.03),t0);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(g);g.connect(sfxBus);o.start(t0);o.stop(t0+dur+0.02);
  }
}
function sWindGust(){if(!actx)return;const t=actx.currentTime;
  const dur=4+Math.random()*4;
  const src=actx.createBufferSource();src.buffer=noiseBuf;src.loop=true;
  const f=actx.createBiquadFilter();f.type='bandpass';f.Q.value=0.7;
  f.frequency.setValueAtTime(400,t);
  f.frequency.linearRampToValueAtTime(900,t+dur*0.5);
  f.frequency.linearRampToValueAtTime(450,t+dur);
  const g=actx.createGain();
  g.gain.setValueAtTime(0.0001,t);
  g.gain.linearRampToValueAtTime(0.03,t+dur*0.4);
  g.gain.linearRampToValueAtTime(0.0001,t+dur);
  src.connect(f);f.connect(g);
  const p=actx.createStereoPanner?actx.createStereoPanner():null;
  if(p){p.pan.setValueAtTime(-0.4,t);p.pan.linearRampToValueAtTime(0.4,t+dur);
    g.connect(p);p.connect(sfxBus);}
  else g.connect(sfxBus);
  src.start(t);src.stop(t+dur+0.1);
}
function sBirdsong(vol){if(!actx)return;const t=actx.currentTime;
  const notes=2+(Math.random()*3|0);            // 2–4 note figure
  let t0=t;
  for(let i=0;i<notes;i++){
    const o=actx.createOscillator(),g=actx.createGain();
    o.type='sine';
    const base=2050+Math.random()*500;
    o.frequency.setValueAtTime(base,t0);
    o.frequency.exponentialRampToValueAtTime(base*1.4,t0+0.06);
    const dur=0.07;
    g.gain.setValueAtTime(0.0001,t0);g.gain.linearRampToValueAtTime(vol*0.04,t0+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(g);g.connect(sfxBus);o.start(t0);o.stop(t0+dur+0.02);
    t0+=0.05+Math.random()*0.09;
  }
}
function sWavelet(vol){if(!actx)return;const t=actx.currentTime;
  const src=actx.createBufferSource();src.buffer=noiseBuf;
  const f=actx.createBiquadFilter();f.type='lowpass';
  f.frequency.setValueAtTime(900,t);f.frequency.exponentialRampToValueAtTime(200,t+0.15);
  const g=actx.createGain();
  g.gain.setValueAtTime(vol*0.08,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.15);
  src.connect(f);f.connect(g);g.connect(sfxBus);
  src.start(t);src.stop(t+0.2);
}

// ---- ambience (per frame): gulls / crickets / wave-lap gain ----
// (legacy sClink retired — the richer sHalyard below covers the basin)
// AMBIENCE GRADE (place/cell rooms — e.g. inside the Bird Sanctuary):
// ext scales the EXTERIOR events (gulls/halyards/wavelets/wave lap) toward
// silence; bird boosts birdsong volume + frequency. framework.js definePlace
// lerps these on enter/exit so the transition breathes.
let ambExt=1,ambBird=1;
export function setAmbienceGrade(ext,bird){ambExt=ext;ambBird=bird;}
let gullT=6,cricketT=7;
let halyardT=3,windT=12,birdT=4,waveletT=6;
export function updateAmbience(dt,t,player){
  if(actx&&game.running){
    gullT-=dt;cricketT-=dt;
    if(gullT<=0){if(player.x>60&&Math.random()<ambExt)sGull();gullT=9+Math.random()*8}
    if(cricketT<=0){if(player.z>60&&player.x<130&&Math.random()<ambExt)sCricket();cricketT=7+Math.random()*6}
    // halyard clinks — Belmont Harbor basin (122,−170), audible within ~45 m
    halyardT-=dt;windT-=dt;birdT-=dt;waveletT-=dt;
    if(halyardT<=0){const dx=player.x-122,dz=player.z+170,d2=dx*dx+dz*dz;
      if(d2<45*45)sHalyard(clamp(1-Math.sqrt(d2)/45,0,1)*ambExt);halyardT=2+Math.random()*5}
    // wind gusts — anywhere on the map
    if(windT<=0){sWindGust();windT=18+Math.random()*22}
    // sanctuary birdsong — within ~35 m of (x87,z−388); the place grade
    // boosts volume and shortens the interval when inside the sanctuary room
    if(birdT<=0){const dx=player.x-87,dz=player.z+388,d2=dx*dx+dz*dz;
      if(d2<35*35)sBirdsong(clamp(1-Math.sqrt(d2)/35,0,1)*Math.min(1.5,ambBird));
      birdT=(3+Math.random()*6)/Math.max(0.001,ambBird)}
    // rock wavelets — Belmont Rocks band (x>140, z20–290) within ~30 m of the waterline (x≈150)
    if(waveletT<=0){const cz=clamp(player.z,20,290),
      dx=player.x-150,dz=player.z-cz,d2=dx*dx+dz*dz;
      if(player.x>140&&d2<30*30)sWavelet(clamp(1-Math.sqrt(d2)/30,0,1));waveletT=4+Math.random()*6}
    if(waveG){
      const q=coastQuery(player.x,player.z);
      let prox=0;
      if(q)prox=clamp(1-Math.abs(q.lat-profileTotal(q.z))/22,0,1);
      // harbor basin west seawall (not a coastQuery edge) — lapping near x≈85, z −20..−328
      if(player.z<-20&&player.z>-328&&player.x>72&&player.x<90)
        prox=Math.max(prox,clamp(1-Math.abs(85-player.x)/14,0,1)*0.55);
      const tgt=prox*(0.045+0.05*(0.6+0.4*Math.sin(t*0.9)+0.2*Math.sin(t*1.7)));
      waveG.gain.value+=(tgt*ambExt-waveG.gain.value)*Math.min(1,dt*3);
    }
  }
}
