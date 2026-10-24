import {FONT_OUTLINES} from './app-font-index.js';
const decoded=new Map();

export function appHasBundledOutline(font,spec,char){
 const index=font.charToGlyphIndex(char);if(!index)return false;
 const entry=FONT_OUTLINES[spec.file];
 if(entry&&entry.numGlyphs===font.tables.maxp?.numGlyphs){
  if(!decoded.has(spec.file))decoded.set(spec.file,Uint8Array.from(atob(entry.bits),c=>c.charCodeAt(0)));
  const bits=decoded.get(spec.file);return Boolean(bits[index>>3]&(1<<(index&7)));
 }
 // Non-bundled fonts retain the original behavior.
 return font.glyphs.get(index).path.commands.some(c=>c.type==='L'||c.type==='Q'||c.type==='C');
}
