import {GlyphLibrary} from './glyph.js?v=1.1.9';
import {measureEncyclopediaScore} from './encyclopedia-performance.js';
self.onmessage=async event=>{
 try{
  if(typeof OffscreenCanvas==='undefined'||!self.fonts)throw Error('worker canvas unavailable');
  // GlyphLibrary uses the same canvas/font interface on both rendering hosts.
  self.document={createElement:name=>{if(name!=='canvas')throw Error('canvas only');return new OffscreenCanvas(128,128);},fonts:self.fonts};
  const {font,glyphs}=event.data;if(font!=='gothic')await GlyphLibrary.load('gothic');
  const library=await GlyphLibrary.load(font);let rows=[],last=performance.now();
  for(const glyph of glyphs){rows.push([glyph,measureEncyclopediaScore(library,glyph)]);
   if(performance.now()-last>100){self.postMessage({rows});rows=[];last=performance.now();}
  }
  self.postMessage({rows,done:true});
 }catch(error){self.postMessage({error:String(error?.message||error)});}
};
