import {createBossMusic} from './boss-music.js';
const FILES={heavy:'impact-heavy.mp3',critical:'critical2.mp3',launch:'launch.mp3',spin:'spin-loop.wav',shatter:'shatter.mp3',versus:'battle.mp3',countdown:'countdown.mp3',button:'button.mp3',rope:'rope.mp3',wind:'wind.mp3',rubber:'rubber.mp3',shine:'shine.mp3',web:'web.mp3',stone:'stone.mp3',pumpkin:'pumpkin-hit.mp3',wolf:'wolf.mp3',laugh:'laugh.mp3'};
const BUTTON={volume:.35,offset:.145};
// Short, low-volume Scout accents; [frequency, duration, volume, waveform, delay].
const SCOUT_CUES={
 recruit:[[660,.12,.045,'sine',0],[990,.13,.045,'sine',.09]],
 land:[[280,.1,.05,'triangle',0],[560,.09,.025,'sine',.035]],
 lost:[[300,.12,.04,'triangle',0],[170,.18,.035,'triangle',.09]],
 dismiss:[[600,.12,.025,'sine',0],[330,.16,.02,'sine',.1]],
 appear:[[240,.08,.025,'triangle',0],[420,.09,.025,'triangle',.07]],
 round:[[520,.08,.025,'sine',0],[780,.1,.02,'sine',.06]],
 best:[[784,.12,.04,'sine',.65],[988,.12,.04,'sine',.76],[1318,.24,.04,'sine',.87]],
 end:[[392,.16,.035,'triangle',.35],[330,.18,.03,'triangle',.49],[262,.26,.035,'triangle',.64]],
 panelOpen:[[400,.08,.016,'sine',0],[560,.08,.016,'sine',.045]],
 panelClose:[[480,.07,.014,'sine',0],[320,.08,.014,'sine',.04]],
 popoverOpen:[[540,.07,.014,'sine',0],[720,.07,.014,'sine',.04]],
 popoverClose:[[640,.07,.012,'sine',0],[440,.07,.012,'sine',.04]]
};
const SPIN={referenceSpeed:40,minRate:.55,maxRate:1.8,volume:.14,smoothing:.15};
import { APP_ROPE as ROPE, APP_RESULT_GAIN } from './app-audio-tuning.js';
export class Sound {
 constructor(enabled=true,bgmEnabled=true){this.enabled=enabled;this.bgmEnabled=bgmEnabled;this.context=null;this.buffers=new Map();this.loading=null;this.fileLoads=new Map();this.voices=new Set();this.spinVoice=null;this.ropeVoices=new Map();this.spinLevel=0;this.lastHit=-Infinity;this.lastCritical=-Infinity;this.lastRubber=[-Infinity,-Infinity];this.cueKey=null;this.cueVoice=null;this.cueGeneration=0;this.buttonLoading=false;this.webVoice=null;this.bossMusic=null;this.bossMusicRequested=false;this.lastPumpkin=-Infinity;this.lastStone=-Infinity;}
 ensureContext(){
   if(!this.context){
    this.context=new (window.AudioContext||window.webkitAudioContext)();
    this.master=this.context.createGain();this.master.gain.value=.65;
    this.compressor=this.context.createDynamicsCompressor();this.compressor.threshold.value=-12;this.compressor.ratio.value=6;
    this.master.connect(this.compressor).connect(this.context.destination);
   }
 }
 preloadButton(){try{this.ensureContext();this.loadFile('button');}catch{}}
 preloadRope(){try{this.ensureContext();this.loadFile('rope');}catch{}}
 unlock(preloadEffects=true){
  try{
   this.ensureContext();
   if(this.enabled&&!document.hidden)this.context.resume().catch(()=>{});
   // Decode ordinary effects after the first interaction. Match cues load
   // separately so VS COM never downloads the longer countdown recording.
   if(preloadEffects)this.loading ||= Promise.all(Object.keys(FILES).filter(key=>!['versus','countdown','button','web','stone','pumpkin','wolf','laugh'].includes(key)).map(key=>this.loadFile(key)));
  }catch{}
 }
 loadFile(key){
  if(this.fileLoads.has(key))return this.fileLoads.get(key);
  const file=FILES[key],loading=(async()=>{
   try{const response=await fetch(new URL('./sounds/'+file,import.meta.url));if(!response.ok)throw Error(response.status);this.buffers.set(key,await this.context.decodeAudioData(await response.arrayBuffer()));}
   catch(error){console.warn('SEを読み込めませんでした:',file,error);}
  })();
  this.fileLoads.set(key,loading);return loading;
 }
 set(enabled){this.enabled=enabled;if(!enabled){this.stopVoices();this.bossMusic?.pause();this.context?.suspend().catch(()=>{});}else{this.unlock();if(this.bossMusicRequested)this.startBossMusic();}}
 get ready(){return this.enabled&&this.context?.state==='running';}
 track(source,gain,extra=[]){
  const voice={source,gain,nodes:[source,gain,...extra],ended:false};this.voices.add(voice);
  voice.finish=()=>{if(voice.ended)return;voice.ended=true;for(const node of voice.nodes)try{node.disconnect();}catch{}this.voices.delete(voice);if(this.spinVoice===voice)this.spinVoice=null;if(this.webVoice===voice)this.webVoice=null;};
  source.onended=voice.finish;return voice;
 }
 route(source,gain,pan=0){
  source.connect(gain);const extra=[];
  if(this.context.createStereoPanner){const panner=this.context.createStereoPanner();panner.pan.value=Math.max(-1,Math.min(1,pan));gain.connect(panner).connect(this.master);extra.push(panner);}
  else gain.connect(this.master);
  return this.track(source,gain,extra);
 }
 sample(key,volume=1,rate=1,loop=false,pan=0,offset=0){
  if(!this.ready||!this.buffers.has(key))return null;
  const c=this.context,source=c.createBufferSource(),gain=c.createGain();source.buffer=this.buffers.get(key);source.playbackRate.value=rate;source.loop=loop;gain.gain.value=volume;
  const voice=this.route(source,gain,pan);source.start(0,offset);return voice;
 }
 button(){
  if(!this.enabled)return;
  this.unlock(false);
  if(this.sample('button',BUTTON.volume,1,false,0,BUTTON.offset)||this.buttonLoading)return;
  this.buttonLoading=true;
  Promise.all([this.loadFile('button'),this.context?.resume()]).then(()=>{if(this.ready)this.sample('button',BUTTON.volume,1,false,0,BUTTON.offset);}).catch(()=>{}).finally(()=>{this.buttonLoading=false;});
 }
 scout(name){
  if(name==='rareAppear'){this.shine();return;}
  const notes=SCOUT_CUES[name];if(!notes||!this.enabled||document.hidden)return;
  this.unlock(false);const play=()=>{if(this.ready&&!document.hidden)for(const note of notes)this.tone(...note);};
  if(this.ready)play();else this.context?.resume().then(play).catch(()=>{});
 }
 shine(){
  if(!this.enabled||document.hidden)return;
  this.unlock(false);const generation=this.cueGeneration;
  const play=()=>{if(generation===this.cueGeneration&&this.ready&&!document.hidden)this.sample('shine',.6);};
  if(this.buffers.has('shine')&&this.ready)play();
  else Promise.all([this.loadFile('shine'),this.context?.state==='running'?Promise.resolve():this.context?.resume()]).then(play).catch(()=>{});
 }
 rope(pointerId,strength,pan=0){
  if(!this.ready||!this.buffers.has('rope'))return;
  const pull=Number.isFinite(strength)?Math.max(0,Math.min(1,strength)):0;
  const rate=ROPE.minRate+(ROPE.maxRate-ROPE.minRate)*pull;
  let item=this.ropeVoices.get(pointerId);
  if(!item){
   const voice=this.sample('rope',0,rate,true,pan,ROPE.offset);if(!voice)return;
   voice.source.loopStart=ROPE.offset;voice.source.loopEnd=Math.min(ROPE.loopEnd,voice.source.buffer.duration);
   item={voice,timer:0};this.ropeVoices.set(pointerId,item);
  }
  const t=this.context.currentTime,volume=ROPE.volume*(.75+.5*pull);
  item.voice.gain.gain.setTargetAtTime(volume,t,ROPE.gainSmoothing);
  item.voice.source.playbackRate.setTargetAtTime(rate,t,ROPE.pitchSmoothing);
  clearTimeout(item.timer);
  item.timer=setTimeout(()=>this.stopRope(pointerId),ROPE.staleMs);
 }
 stopRope(pointerId){
  const item=this.ropeVoices.get(pointerId);if(!item)return;
  clearTimeout(item.timer);this.ropeVoices.delete(pointerId);
  const t=this.context.currentTime,gain=item.voice.gain.gain;
  gain.cancelScheduledValues(t);gain.setValueAtTime(gain.value,t);gain.linearRampToValueAtTime(0,t+ROPE.release);
  try{item.voice.source.stop(t+ROPE.release+.01);}catch{}
 }
 stopRopes(){for(const pointerId of this.ropeVoices.keys())this.stopRope(pointerId);}
 stopVoices(){this.stopCue();for(const item of this.ropeVoices.values())clearTimeout(item.timer);this.ropeVoices.clear();for(const voice of [...this.voices]){try{voice.source.stop();}catch{}voice.finish();}this.voices.clear();this.spinVoice=null;this.webVoice=null;this.lastPumpkin=-Infinity;this.lastStone=-Infinity;this.lastHit=-Infinity;this.lastCritical=-Infinity;this.lastRubber=[-Infinity,-Infinity];}
 reset(){this.spinLevel=0;this.stopVoices();this.stopBossMusic();}
 preloadMatchCue(key){if(this.enabled){this.unlock();if(this.context)this.loadFile(key);}}
 playCue(key,volume){
  if(!this.enabled)return;
  this.unlock();
  if(this.cueKey===key&&(this.cueVoice&&!this.cueVoice.ended||!this.buffers.has(key)))return;
  this.stopCue();this.cueKey=key;const generation=this.cueGeneration;
  const start=()=>{if(this.cueGeneration===generation&&this.cueKey===key&&this.ready)this.cueVoice=this.sample(key,volume);};
  if(this.buffers.has(key)&&this.ready)start();
  else Promise.all([this.loadFile(key),this.context?.state==='running'?Promise.resolve():this.context?.resume()]).then(start).catch(()=>{});
 }
 versus(){this.playCue('versus',.75);}
 countdown(){this.playCue('countdown',.58);}
 stopCue(key){
  if(key&&this.cueKey!==key)return;
  this.cueGeneration++;this.cueKey=null;
  const voice=this.cueVoice;this.cueVoice=null;
  if(voice){try{voice.source.stop();}catch{}voice.finish();}
 }
 updateSpin(angularSpeed){
  // Use absolute axial angular speed (rad/s), not a fraction of launch speed.
  const speed=Number.isFinite(angularSpeed)?Math.max(0,angularSpeed):0;
  this.spinLevel=speed;
  if(!this.ready)return;
  if(speed<.5){if(this.spinVoice){this.spinVoice.source.stop();this.spinVoice=null;}return;}
  const rate=Math.min(SPIN.maxRate,SPIN.minRate+.55*speed/SPIN.referenceSpeed);
  this.spinVoice ||= this.sample('spin',0,rate,true);
  if(this.spinVoice){const t=this.context.currentTime;this.spinVoice.gain.gain.setTargetAtTime(SPIN.volume*Math.min(1,speed/Math.PI),t,.12);this.spinVoice.source.playbackRate.setTargetAtTime(rate,t,SPIN.smoothing);}
 }
 tone(frequency,duration=.12,volume=.06,type='sine',delay=0,pan=0){if(!this.ready)return;const c=this.context,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(Math.max(40,frequency*.65),t+duration);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);this.route(o,g,pan);o.start(t);o.stop(t+duration+.01);}
 hit(strength=.5,pan=0,critical=false){
  if(!this.ready)return;
  const now=this.context.currentTime;
  if(critical){if(now-this.lastCritical<.18)return;this.lastCritical=now;}
  else if(now-this.lastHit<.1)return;
  this.lastHit=now;const force=Math.max(0,Math.min(1,strength)),position=Math.max(-1,Math.min(1,pan));
  if(critical){
   // Skip the recording's brief leading silence; keep the layered metal hit
   // as a fallback while this short sample is still loading.
   if(this.sample('critical',.58+force*.12,1,false,position,.08))return;
   const pitch=.97+Math.random()*.06,level=.78+force*.22;
   let played=false;
   for(const [rate,volume] of [[1.30,.40],[1.70,.32],[2.15,.26]])played=Boolean(this.sample('heavy',volume*level,rate*pitch,false,position))||played;
   if(played)return;
   for(const frequency of [580,870,1305])this.tone(frequency*pitch,.13,.038+force*.016,'triangle',0,position);
   return;
  }
  const pitch=.94+Math.random()*.12;
  if(force>=.45){
   const played=this.sample('heavy',.32+force*.42,(1.03-force*.1)*pitch,false,position);
   // A short sub hit sits under the metal sample so strong impacts feel weighty.
   this.tone(92-force*24,.17,.038+force*.052,'sine',0,position);
   this.tone(190-force*55,.11,.018+force*.026,'triangle',.008,position);
   if(played)return;
  }
  this.tone(145*pitch,.09,.035+force*.045,'triangle',0,position);this.tone(1150*pitch,.045,.015+force*.02,'square',0,position);
 }
 shatter(){if(this.sample('shatter',.7))return;this.tone(95,.3,.08,'sawtooth');[0,.035,.08].forEach(t=>this.tone(1800+Math.random()*900,.08,.025,'square',t));}
 ropeHit(index,pan=0){
  if(!this.ready)return;
  const now=this.context.currentTime;if(now-(this.lastRubber[index]??-Infinity)<.14)return;
  this.lastRubber[index]=now;this.sample('rubber',.65,1,false,pan);
 }
 setBgm(enabled){this.bgmEnabled=Boolean(enabled);if(!this.bgmEnabled)this.bossMusic?.pause();else if(this.bossMusicRequested)this.startBossMusic();}
 startBossMusic(){this.bossMusicRequested=true;if(!this.enabled||!this.bgmEnabled)return;try{this.ensureContext();this.bossMusic ||= createBossMusic({context:this.context,output:this.master,url:new URL('./sounds/halloween-bgm.mp3',import.meta.url)});this.bossMusic.resume();}catch{}}
 updateBossMusic(){if(this.enabled)this.bossMusic?.update();}
 stopBossMusic(){this.bossMusicRequested=false;this.bossMusic?.dispose();this.bossMusic=null;}
 async preloadBossCutin(){if(!this.enabled)return;try{this.ensureContext();await this.loadFile('wolf');}catch{}}
 bossCutin(){if(this.ready&&!document.hidden)this.sample('wolf',.65);}
 bossClear(){if(this.ready&&!document.hidden)this.sample('laugh',.65);}
 preloadBoss(stage){try{this.ensureContext();if(this.enabled&&['halloween-candy','halloween-moon'].includes(stage.id))this.loadFile('wolf');if(this.enabled&&stage.id==='halloween-moon')this.loadFile('laugh');if(stage.props?.some(prop=>prop.kind==='pumpkin'))this.loadFile('pumpkin');if(stage.webs?.length)this.loadFile('web');if(stage.props?.some(prop=>prop.kind==='grave'))this.loadFile('stone');}catch{}}
 pumpkinHit(strength=.5,pan=0){if(!this.ready)return;const now=this.context.currentTime;if(now-this.lastPumpkin<.1)return;this.lastPumpkin=now;const force=Math.max(0,Math.min(1,strength)),pitch=.96+Math.random()*.08;if(this.sample('pumpkin',.45+force*.15,pitch,false,pan))return;this.tone(420*pitch,.075,.055+force*.035,'sine',0,pan);this.tone(160*pitch,.11,.025+force*.025,'triangle',.008,pan);}
 stoneBreak(pan=0){if(!this.ready)return;const now=this.context.currentTime;if(now-this.lastStone<.04)return;this.lastStone=now;if(!this.sample('stone',.65,.96+Math.random()*.08,false,pan)){this.tone(150,.16,.06,'triangle',0,pan);this.tone(680,.08,.025,'square',.015,pan);}}
 webFooting(active,pan=0){if(!active||!this.ready){this.stopWeb();return;}if(this.webVoice)return;const voice=this.sample('web',0,1,true,pan);if(!voice)return;this.webVoice=voice;voice.gain.gain.setTargetAtTime(.3,this.context.currentTime,.035);}
 stopWeb(){const voice=this.webVoice;if(!voice)return;this.webVoice=null;const t=this.context.currentTime,gain=voice.gain.gain;gain.cancelScheduledValues(t);gain.setValueAtTime(gain.value,t);gain.linearRampToValueAtTime(0,t+.06);try{voice.source.stop(t+.07);}catch{voice.finish();}}
 boost(pan=0){if(this.ready)this.sample('wind',.65,.96+Math.random()*.08,false,pan);}
 launch(){if(!this.sample('launch',.65))this.tone(360,.28,.08,'sawtooth');}
 result(win){
  const resultTone=(frequency,duration,volume,...rest)=>this.tone(frequency,duration,volume*APP_RESULT_GAIN,...rest);
  if(win){
   // A compact two-stage fanfare: rising brass-like notes, then a bright major chord.
   [262,330,392,523].forEach((frequency,i)=>{
    resultTone(frequency,.3,.074,'triangle',i*.085);
    resultTone(frequency*2,.16,.025,'sine',i*.085+.018);
   });
   [262,330,392,523].forEach((frequency,i)=>resultTone(frequency,.62,i===3?.074:.052,i===0?'sawtooth':'triangle',.39+i*.012));
   [1046,1318,1568].forEach((frequency,i)=>resultTone(frequency,.22,.025,'sine',.47+i*.055));
  }else{
   // A weighty descending phrase with a low final impact.
   [330,262,196,147].forEach((frequency,i)=>{
    resultTone(frequency,.34,.068,'triangle',i*.12);
    resultTone(frequency/2,.42,.036,'sawtooth',i*.12+.018);
   });
   resultTone(73,.72,.1,'sawtooth',.43);
   resultTone(49,.8,.074,'triangle',.48);
  }
 }
 pause(){this.bossMusic?.pause();this.context?.suspend().catch(()=>{});}
 resume(){if(this.enabled&&!document.hidden){this.context?.resume().catch(()=>{});if(this.bossMusicRequested&&this.bgmEnabled)this.bossMusic?.resume();}}
}
