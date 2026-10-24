/** Bleed solid colors just outside the hand-drawn silhouette to avoid black WebGL texture seams.
 * The contour triangles define visibility; the render texture must be opaque so bilinear
 * filtering does not darken edges. Does not alter the stored source drawing.
 */
export function padTexturePixels(input,width,height,passes=3){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||input.length!==width*height*4)throw Error('Invalid texture');
  const rgba=new Uint8ClampedArray(input),present=new Uint8Array(width*height);
  for(let i=0;i<present.length;i++)present[i]=rgba[4*i+3]>=32?1:0;
  for(let round=0;round<passes;round++){
    const next=present.slice();
    for(let i=0;i<present.length;i++){
      if(present[i])continue;
      const x=i%width,y=(i/width)|0;
      const candidates=[x>0?i-1:-1,x+1<width?i+1:-1,y>0?i-width:-1,y+1<height?i+width:-1];
      let donor=-1;
      for(const n of candidates)if(n>=0&&present[n]){donor=n;break;}
      if(donor<0)continue;
      for(let k=0;k<3;k++)rgba[4*i+k]=rgba[4*donor+k];
      next[i]=1;
    }
    present.set(next);
  }
  // Original strokes are already antialiased; preserve RGB rather than premultiplying twice.
  for(let i=0;i<present.length;i++)rgba[4*i+3]=255;
  return rgba;
}
export function prepareDisplayTexture(original,{maxSize=1024}={}){
  if(!original||!original.width||!original.height)throw Error('Missing canvas texture');
  const width=Math.min(original.width,maxSize),height=Math.min(original.height,maxSize);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Canvas 2D unavailable');
  ctx.drawImage(original,0,0,width,height);
  const pixels=ctx.getImageData(0,0,width,height);
  pixels.data.set(padTexturePixels(pixels.data,width,height));
  ctx.putImageData(pixels,0,0);
  return canvas;
}
