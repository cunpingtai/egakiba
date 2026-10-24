/** Feedback governor, separate from Rapier. Throttles repeated effects and vibration. */
export const FX_LEVELS=Object.freeze({full:1,standard:.62,quiet:.25,off:0});
export function feedbackDecision({now=0,lastVisual=-Infinity,lastAudio=-Infinity,lastHaptic=-Infinity,critical=false,intensity=.5,level='standard'}={}){
 const weight=FX_LEVELS[level]??FX_LEVELS.standard;
 if(weight===0)return {visual:false,audio:false,haptic:false,weight:0};
 const visualGap=critical?90:130,audioGap=critical?170:110,hapticGap=critical?320:650;
 return {visual:now-lastVisual>=visualGap,audio:now-lastAudio>=audioGap,haptic:now-lastHaptic>=hapticGap&&(critical||intensity>.7),weight};
}
export function hapticDuration({critical=false,intensity=.5,level='standard'}={}){
 if(level==='off'||level==='quiet')return 0;
 return critical?Math.round(12*(FX_LEVELS[level]||0)):intensity>.75?6:0;
}
export function resultMotion({type='draw',reduced=false}={}){return {type,transitionMs:reduced?0:type==='win'?500:350,shake:type==='win'&&!reduced?4:0};}
