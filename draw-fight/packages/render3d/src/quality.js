/** Deterministic quality policy for *visuals only*. Combat remains at 60 ticks/sec. */
export class AdaptiveQuality {
  constructor({ mobile=false, maxPixelRatio=2 }={}) {
    this.maxPixelRatio=Math.max(1,Math.min(2,maxPixelRatio));
    this.level=mobile?1:0;
    this.samples=[];
    this.cooldown=0;
  }
  get ratio(){return Math.min(this.maxPixelRatio,[2,1.5,1][this.level]);}
  /** Sample real wall-clock frame interval in milliseconds; avoid short spikes and tab returns. */
  sample(deltaMs){
    if(!Number.isFinite(deltaMs)||deltaMs<=0||deltaMs>200)return false;
    this.samples.push(deltaMs);
    if(this.samples.length<100)return false;
    if(this.samples.length>120)this.samples.shift();
    const avg=this.samples.reduce((a,b)=>a+b,0)/this.samples.length;
    if(this.cooldown>0){this.cooldown--;return false;}
    if(avg>27&&this.level<2){this.level++;this.cooldown=120;this.samples.length=0;return true;}
    if(avg<18&&this.level>0){this.level--;this.cooldown=180;this.samples.length=0;return true;}
    return false;
  }
}
