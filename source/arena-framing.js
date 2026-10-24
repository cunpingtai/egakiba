// Fit the full circular floor/shell in perspective, including the near edge.
// X/Z are world coordinates; the camera looks at the origin from (0,h,d).
export function fittedArenaFov({radius,top=0,bottom=-.32,aspect,cameraHeight,cameraDistance,verticalFrame=0,margin=.9}){
 const distance=Math.hypot(cameraHeight,cameraDistance);let tangent=verticalFrame/distance;
 for(let i=0;i<64;i++){const a=i*Math.PI/32,x=radius*Math.cos(a),z=radius*Math.sin(a);for(const y of [bottom,top]){const depth=distance-(cameraHeight*y+cameraDistance*z)/distance,up=(cameraDistance*y-cameraHeight*z)/distance;tangent=Math.max(tangent,Math.abs(up)/(depth*margin),Math.abs(x)/(depth*aspect*margin));}}
 return 2*Math.atan(tangent)*180/Math.PI;
}
