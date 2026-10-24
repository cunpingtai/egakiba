/** Gesture interpretation shared by touch and mouse. No DOM or physics dependency. */
export const AIM_LIMIT_DEGREES=80;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function pullAim(dx,dy,{maxDistance=190,minDistance=22}={}){
 if(!Number.isFinite(dx)||!Number.isFinite(dy))return null;
 const distance=Math.hypot(dx,dy);
 if(distance<minDistance)return null;
 // Pull left -> fire right; pull right -> fire left. Straight down -> forward.
 // A positive input angle turns the launch to the right, consistent with arrow-key aiming.
 const angle=clamp(Math.atan2(-dx,Math.abs(dy)||1e-9),-AIM_LIMIT_DEGREES*Math.PI/180,AIM_LIMIT_DEGREES*Math.PI/180);
 return {angle,power:clamp(distance/maxDistance,.15,1),distance};
}
export function swipeDash(dx,dy,{minDistance=20}={}){
 if(!Number.isFinite(dx)||!Number.isFinite(dy))return null;
 const distance=Math.hypot(dx,dy);
 if(distance<minDistance)return null;
 // Screen y grows down, while battle heading faces forward along +z.
 return {heading:Math.atan2(dx,-dy),distance};
}
export function shouldCaptureGameplayKey(target){
 if(!target||typeof target.closest!=='function')return true;
 return !target.closest('input,textarea,select,button,summary,[contenteditable="true"]');
}
export function compactOutcome(outcome){return outcome==='win'?'VICTORY':outcome==='draw'?'DRAW':'DEFEAT';}
