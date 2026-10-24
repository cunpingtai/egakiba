/** R13: visual scaling only. Never changes physics step, HP, or battle rules. */
export const QUALITY_PRESETS=Object.freeze({
 high:Object.freeze({pixelRatio:1.7,shadows:true,particles:130,effectFPS:60,renderFPS:60}),
 balanced:Object.freeze({pixelRatio:1.25,shadows:true,particles:66,effectFPS:40,renderFPS:60}),
 battery:Object.freeze({pixelRatio:1,shadows:false,particles:26,effectFPS:24,renderFPS:30})
});
export function defaultQuality({width=1024,memory=8,cores=8,saveData=false,reducedMotion=false}={}){
 if(saveData||memory<=2||cores<=2||width<=350)return 'battery';
 if(memory<=4||cores<=4||width<=700||reducedMotion)return 'balanced';
 return 'high';
}
export function viewportClass({width=390,height=844}={}){
 if(height<=470&&width>height)return 'landscape-short';
 if(height<660)return 'compact';
 return width<=360?'narrow':'regular';
}
/** Rolling FPS regulator. Switching down is deliberately easier than switching up. */
export class FrameQualityController{
 constructor(initial='high',{sample=90,cooldownMs=12000}={}){this.level=initial;this.sample=sample;this.cooldownMs=cooldownMs;this.times=[];this.lowWindows=0;this.fastWindows=0;this.lastChanged=-Infinity;this.mode='auto';this.maxLevel=initial;}
 setMode(mode,deviceLevel=this.level){this.mode=mode;if(mode!=='auto'&&QUALITY_PRESETS[mode])this.level=mode;else if(QUALITY_PRESETS[deviceLevel]){this.level=deviceLevel;this.maxLevel=deviceLevel;}this.reset();return this.level;}
 reset(){this.times=[];this.lowWindows=0;this.fastWindows=0;}
 observe(ms,now=0){if(this.mode!=='auto'||!Number.isFinite(ms)||ms<4||ms>250)return null;
  this.times.push(ms);if(this.times.length<this.sample)return null;
  const sorted=this.times.sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length*.5)],p90=sorted[Math.floor(sorted.length*.9)];this.times=[];
  this.lowWindows=(median>23||p90>38)?this.lowWindows+1:0;
  this.fastWindows=(median<14.8&&p90<19)?this.fastWindows+1:0;
  if(now-this.lastChanged<this.cooldownMs)return null;
  const levels=['battery','balanced','high'],idx=levels.indexOf(this.level);let next=this.level;
  if(this.lowWindows>=2&&idx>0)next=levels[idx-1];
  else if(this.fastWindows>=8&&idx<levels.indexOf(this.maxLevel))next=levels[idx+1];
  if(next!==this.level){this.level=next;this.lastChanged=now;this.reset();return next;}
  return null;
 }
}
export function renderDue(now,last=0,fps=60){return !last||now-last>=1000/fps-1.2;}
