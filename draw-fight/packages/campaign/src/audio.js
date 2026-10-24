/** Compact synthesized notebook SFX. No external audio license or network dependency. */
export class GameAudio {
  constructor(storage){this.storage=storage;this.context=null;this.enabled=storage?.getItem('rakugaki-v2-sound')==='on';}
  setEnabled(enabled){this.enabled=!!enabled;try{this.storage?.setItem('rakugaki-v2-sound',enabled?'on':'off');}catch{};}
  play(kind){if(!this.enabled)return;
    try{const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return;this.context??=new C();if(this.context.state==='suspended')void this.context.resume();
      const c=this.context,now=c.currentTime,defs={tap:[580,760,.075,.022],attack:[250,120,.10,.036],hit:[195,70,.16,.07],block:[740,310,.105,.044],perfect:[840,1250,.18,.06],break:[230,52,.25,.08],win:[620,950,.32,.06],lose:[280,135,.28,.045],boss:[185,80,.22,.045]};
      const [from,to,time,vol]=defs[kind]||defs.tap;
      const o=c.createOscillator(),g=c.createGain();o.type=kind==='perfect'||kind==='win'?'sine':'triangle';o.frequency.setValueAtTime(from,now);o.frequency.exponentialRampToValueAtTime(to,now+time);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(vol,now+.012);g.gain.exponentialRampToValueAtTime(.0001,now+time);o.connect(g).connect(c.destination);o.start(now);o.stop(now+time+.01);
    }catch{/* audio must never interrupt battle */}
  }
  close(){try{void this.context?.close();}catch{}this.context=null;}
}
