import {pullAim} from './r11-input.mjs';
export const distance=(x,y)=>Math.hypot(x,y);
/** Returns an action without mutating the battle. Pull back toward the anchor to cancel. */
export function assessPull({dx,dy,everArmed=false,precision=false,initialDistance=0,anchorDistance=0,release=false,pointerCancelled=false}={}){
 if(pointerCancelled)return {armed:false,outcome:'cancel',aim:null};
 const aim=pullAim(dx,dy,{minDistance:20,maxDistance:170});
 const armed=Boolean(aim)||everArmed;
 // Same radius as the original pull: farther than 20 CSS px launches, returning inside it cancels.
 const backToOrigin=armed&&distance(dx,dy)<=20;
 if(!release)return {armed,aim,backToOrigin};
 return {armed,aim,outcome:!aim||backToOrigin?'cancel':precision?'aim':'fire'};
}
export function hitTarget({x,y,centerX,centerY,radius=85}){
 return Number.isFinite(x)&&Number.isFinite(y)&&Math.hypot(x-centerX,y-centerY)<=radius;
}
