import {GlyphLibrary} from './glyph.js?v=1.1.9';
import {EncyclopediaPreview} from './encyclopedia-preview.js';
// Loaded only on receipt. Reuse the real glyph/materials; never start physics.
export async function createSkinReceiptPreview(canvas,skin,{libraries,isCurrent=()=>true}={}){
 const library=libraries?.()?.get('gothic')||await GlyphLibrary.load('gothic'),base=library.get('文','mixed');
 if(!isCurrent())return null;
 const preview=new EncyclopediaPreview(canvas);
 try{
  preview.show(base,false,false,false,skin);preview.presentationMotion=true;preview.distance=5.1;preview.pitch=.8;preview.yaw=.1;
  const tick=preview.tick.bind(preview);let time=0;
  preview.tick=dt=>{tick(dt);time+=dt;if(!preview.motion.matches)preview.group.rotation.y=.08+Math.sin(time*.6)*.16;};return preview;
 }catch(error){preview.dispose();throw error;}
}
