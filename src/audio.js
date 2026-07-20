import { clamp, game } from './core.js';
import { coastQuery, profileTotal } from './coast.js';

// ------------------------------ audio ----------------------------------
let actx=null,musicBus,sfxBus,noiseBuf,waveG=null,resumeTries=0;
const AC_=window.AudioContext||window.webkitAudioContext;
// ---- volume buses (task 085 settings) -------------------------------------
// The Music / SFX sliders are 0..1 MULTIPLIERS over today's exact default gains
// (MUSIC_BASE / SFX_BASE), so a fresh install with both at 1.0 reproduces the
// shipped mix bit for bit — "defaults = today's behavior exactly". Master mute
// zeroes both buses without disturbing the slider positions. settings.js calls
// these at boot (actx still null → they only stash the module vars, the actx-
// null-until-start contract is preserved) and again live from the card; they
// apply to the real bus gains the moment initAudio() creates them.
const MUSIC_BASE=0.16, SFX_BASE=0.85;
let _musicVol=1,_sfxVol=1,_muted=false;
function applyLevels(){
  if(musicBus)musicBus.gain.value=_muted?0:MUSIC_BASE*_musicVol;
  if(sfxBus)sfxBus.gain.value=_muted?0:SFX_BASE*_sfxVol;
}
export function setMusicVol(v){_musicVol=clamp(v,0,1);applyLevels();}
export function setSfxVol(v){_sfxVol=clamp(v,0,1);applyLevels();}
export function setMuted(b){_muted=!!b;applyLevels();}
// audioLevels() — debug/tools + settings snapshot: the stored multipliers AND
// the LIVE bus gains (null until initAudio). E2E asserts these change on drag.
export function audioLevels(){return{musicVol:_musicVol,sfxVol:_sfxVol,muted:_muted,
  musicGain:musicBus?musicBus.gain.value:null,sfxGain:sfxBus?sfxBus.gain.value:null};}
export function initAudio(){
  if(actx)return;actx=new AC_();resumeAudio();
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
  applyLevels();   // fold in any settings chosen before start (muted / turned down)
  startMusic();
}
// --- persistent audio resume net (mobile) ------------------------------------
// initAudio() creates the context ONCE inside the start gesture, but mobile OSes
// can bring it up 'suspended' (iOS' first-gesture quirk) or 'interrupted' and
// re-suspend it on backgrounding / calls — and NOTHING else ever resumed it, so
// the game went silent forever (issue 007). resumeAudio() is cheap + idempotent:
// fire it on every gesture and on tab-refocus, forever. It GUARDS actx, so it is
// a no-op until initAudio() has run and never creates a context itself — the
// actx-null-until-start contract packs rely on is preserved.
export function resumeAudio(){
  if(!actx)return;
  if(actx.state!=='running'){resumeTries++;try{actx.resume();}catch(e){}}
}
// ?audiodbg=1 probe feed (main.js paints #audiodbg): live state + resume count so
// the owner can read the truth on-device instead of guessing.
export function audioDbg(){return{state:actx?actx.state:'none',resumes:resumeTries};}
// debug/tools only (like __hd.scene) — the live context handle so the headless
// repro can force-suspend it (simulate an OS interruption) and prove recovery.
export function audioCtx(){return actx;}
// bind the net once (main.js calls at startup, independent of user start). The
// listeners are harmless before audio starts (resumeAudio no-ops on null actx).
export function installAudioResumeNet(){
  const net=()=>resumeAudio();
  addEventListener('pointerdown',net,{passive:true});
  addEventListener('touchend',net,{passive:true});
  addEventListener('keydown',net,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)resumeAudio();});
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
function noiseHit(t,dur,type,freq,q,peak,pan){
  const src=actx.createBufferSource();src.buffer=noiseBuf;
  const f=actx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;
  const g=actx.createGain();
  g.gain.setValueAtTime(peak,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  src.connect(f);f.connect(g);
  // optional stereo placement (the footstep L/R-foot skew); mono when omitted so
  // every pre-existing caller stays bit-identical.
  if(pan&&actx.createStereoPanner){const p=actx.createStereoPanner();p.pan.value=pan;g.connect(p);p.connect(sfxBus);}
  else g.connect(sfxBus);
  src.start(t);src.stop(t+dur+0.05);
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
// footstep timbres by SURFACE + per-step DE-REPETITION so a ~0.26 s stride never
// reads machine-gun (design audit B2). Base tone per surface in STEP_TONE (a
// module constant → zero per-step allocation); each step then jitters the
// filter freq ±8% and alternates an L/R foot skew — ~15% gain up on one foot,
// down on the other, with a small stereo pan. 100% synth: sand = a soft low
// lowpass thud, asphalt = a quiet high bandpass click, paver = a firm concrete
// clack; wood / stone / grass keep their shipped tone exactly.
const STEP_TONE={
  wood:   {dur:0.09,type:'bandpass',freq:320, q:1.2,peak:0.16},
  stone:  {dur:0.07,type:'bandpass',freq:950, q:1.5,peak:0.13},
  paver:  {dur:0.06,type:'bandpass',freq:680, q:1.3,peak:0.14},
  asphalt:{dur:0.05,type:'bandpass',freq:1600,q:1.0,peak:0.075},
  sand:   {dur:0.07,type:'lowpass', freq:300, q:0.7,peak:0.06},
  grass:  {dur:0.08,type:'lowpass', freq:480, q:0.8,peak:0.10},
};
let _stepFoot=0;
const _stepDbg={surf:'grass',freq:480,peak:0.1,pan:0,foot:0};   // mutated in place (no per-step alloc)
export function stepDbg(){return _stepDbg;}   // debug/tools only: last footstep's varied params
export function sStep(surf){if(!actx)return;
  const s=STEP_TONE[surf]||STEP_TONE.grass;
  const foot=(_stepFoot^=1);                        // alternate left/right each step
  const freq=s.freq*(1+(Math.random()*2-1)*0.08);   // ±8% frequency jitter
  const peak=s.peak*(foot?1.15:0.85);               // ~15% gain skew between the feet
  const pan=foot?0.15:-0.15;                         // small L/R stereo placement
  noiseHit(actx.currentTime,s.dur,s.type,freq,s.q,peak,pan);
  _stepDbg.surf=surf;_stepDbg.freq=freq;_stepDbg.peak=peak;_stepDbg.pan=pan;_stepDbg.foot=foot;
}
// 109 (design audit B5 — "the ground answers back"): two land-touch feedbacks.
// sLand — a soft low body-THUMP on jump landing, gain scaled by fall height
// (0..1) and capped small, so a gentle hop barely speaks while a big drop lands
// with weight. One lowpass noise burst, 100% synth, guards actx. Pairs with the
// surface sStep + dust burst the engine already fires on touchdown.
const _landDbg={n:0,fall:0,peak:0,t:-1};
export function landDbg(){return _landDbg;}   // debug/tools only: last landing thud
export function sLand(fall){if(!actx)return;
  const k=fall<0?0:fall>1?1:fall;
  const peak=0.045+0.09*k;                          // ~0.045..0.135 — capped small
  noiseHit(actx.currentTime,0.12+0.05*k,'lowpass',170+50*k,0.8,peak);
  _landDbg.n++;_landDbg.fall=k;_landDbg.peak=peak;_landDbg.t=actx.currentTime;
}
// sRustle — a soft leafy "shhk" when the mayor brushes past grass tufts / flower
// beds. Lowpass-filtered noise, low peak; a small deterministic freq wobble off
// game.tNow (NOT rng, no alloc) keeps repeats from reading identical, the way
// sStep de-repeats footfalls. The caller throttles it (>=300 ms). Guards actx.
const _rustleDbg={n:0,freq:0,t:-1};
export function rustleDbg(){return _rustleDbg;}   // debug/tools only: last brush rustle
export function sRustle(){if(!actx)return;
  const freq=1250+Math.sin(game.tNow*6.3)*220;
  noiseHit(actx.currentTime,0.16,'lowpass',freq,0.7,0.05);
  _rustleDbg.n++;_rustleDbg.freq=freq;_rustleDbg.t=actx.currentTime;
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
