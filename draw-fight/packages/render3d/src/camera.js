/** Stable camera in shared world coordinates. Shrinks to keep both fighters visible on narrow screens. */
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function cameraPose(match,aspect){
  const p1=match.p1,p2=match.p2;
  const mx=(p1.x+p2.x)*.5,mz=(p1.z+p2.z)*.5;
  const separation=Math.hypot(p1.x-p2.x,p1.z-p2.z);
  let fx=p1.faceX,fz=p1.faceZ;
  if(!Number.isFinite(fx)||!Number.isFinite(fz)||Math.hypot(fx,fz)<1e-4){fx=p2.x-p1.x;fz=p2.z-p1.z;}
  const fl=Math.hypot(fx,fz)||1;fx/=fl;fz/=fl;
  const rx=-fz,rz=fx,angle=.8;
  const narrow=Math.max(0,Math.min(1,(.95-aspect)/.65));
  const distance=4.6+separation*.72+narrow*2.4;
  const cx=-fx*Math.cos(angle)+rx*Math.sin(angle);
  const cz=-fz*Math.cos(angle)+rz*Math.sin(angle);
  return {eye:[mx+cx*distance,1.55+distance*.30,mz+cz*distance],focus:[mx,.84,mz],fov:aspect<.9?56:52,distance};
}
/** True if center-to-center visual stage layout is enclosed by projected safe screen bounds.
 * It is an intentionally conservative planning estimate, not a GPU visibility oracle.
 */
export function estimatedHorizontalCoverage(separation,aspect,fovDegrees,distance){
  const halfVert=Math.tan(fovDegrees*Math.PI/360)*distance;
  return (separation+2.2)/(2*halfVert*Math.max(.1,aspect));
}
