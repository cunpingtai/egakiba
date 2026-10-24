import { createCpu } from '../../game-core/src/cpu.ts';
/**
 * R3.1: data-driven boss choreography. All timings are simulation ticks.
 * These are command patterns, not damage or HP overrides. Deterministic
 * boss intent means its warning can be rehearsed and replayed later.
 */
export const BOSS_PATTERNS=Object.freeze({
  '1-4':Object.freeze({period:480,offset:100,warning:56,rush:74,rest:42,charge:33,cycle:52,strafe:0,
    title:'ノートの番人',warningLabel:'⚠ 大きな一撃がくる！ ガードの準備！',rushLabel:'⚡ 突進！ 横にかわそう！',restLabel:'★ スキあり！ いま反撃！'}),
  '2-4':Object.freeze({period:420,offset:105,warning:52,rush:100,rest:60,charge:33,cycle:58,strafe:.64,
    title:'インクのおばけ',warningLabel:'⚠ おばけが回りこむ！ 距離を見よう！',rushLabel:'⚡ まわりこみ攻撃！',restLabel:'★ おばけがおつかれ！ チャンス！'}),
  '3-4':Object.freeze({period:390,offset:115,warning:70,rush:118,rest:52,charge:34,cycle:52,strafe:.24,
    title:'インクの王',warningLabel:'⚠ 連続攻撃の予告！ いったん離れよう！',rushLabel:'⚡ 2連撃！ 焦らず守ろう！',restLabel:'★ 王が息切れ！ 反撃！'}),
});
const nonnegativeModulo=(n,m)=>((n%m)+m)%m;
/** Full cue for the HUD, AI and automated tests; exactly one timing source. */
export function bossCue(level,tick){
  if(!level?.boss)return null;
  const profile=BOSS_PATTERNS[level.id];
  if(!profile)throw new Error(`Missing boss choreography for ${level.id}`);
  const local=nonnegativeModulo(tick-profile.offset,profile.period);
  let phase='normal',start=profile.warning+profile.rush+profile.rest,end=profile.period;
  if(local<profile.warning){phase='warning';start=0;end=profile.warning;}
  else if(local<profile.warning+profile.rush){phase='rush';start=profile.warning;end=profile.warning+profile.rush;}
  else if(local<profile.warning+profile.rush+profile.rest){phase='rest';start=profile.warning+profile.rush;end=start+profile.rest;}
  const label=profile[phase+'Label']||'';
  return {phase,remainingTicks:end-local,elapsedTicks:local-start,durationTicks:end-start,profile,label};
}
export const bossPhase=(level,tick)=>bossCue(level,tick)?.phase||null;
/** Story behaviors use the same deterministic commands as a player. */
export function createLevelCpu(level,side,seed){
  const brain=createCpu(level.style,side,seed);
  if(!level.boss)return {decide:state=>brain.decide(state),tell:()=>null};
  return {
    tell:tick=>bossPhase(level,tick),
    decide(state){
      const cue=bossCue(level,state.tick),base=brain.decide(state);
      const self=side==='p1'?state.p1:state.p2,foe=side==='p1'?state.p2:state.p1;
      if(cue.phase==='warning')return {...base,attackHeld:false,guardHeld:true,moveX:0,moveZ:0};
      if(cue.phase==='rest')return {...base,attackHeld:false,guardHeld:false,moveX:0,moveZ:0};
      if(cue.phase==='rush'){
        const dx=foe.x-self.x,dz=foe.z-self.z,dist=Math.hypot(dx,dz)||1;
        const forwardX=dx/dist,forwardZ=dz/dist;
        // Side steps are distinct for the ghost and king but movement stays normalized.
        const direction=Math.floor(cue.elapsedTicks/24)%2===0?1:-1;
        const sx=-forwardZ*cue.profile.strafe*direction,sz=forwardX*cue.profile.strafe*direction;
        const mx=forwardX+sx,mz=forwardZ+sz,len=Math.max(1,Math.hypot(mx,mz));
        const charge=cue.elapsedTicks%cue.profile.cycle;
        return {moveX:mx/len,moveZ:mz/len,attackHeld:charge<cue.profile.charge,guardHeld:false};
      }
      return base;
    }
  };
}
