import {EMOJI} from './challenge-catalog.js';
const CIRCLE_EMOJI=new Set([0x26aa,0x26ab,0x2b55,0x3297,0x3299,0x1f518,0x1f534,0x1f535,0x1f7e0,0x1f7e1,0x1f7e2,0x1f7e3,0x1f7e4]);
const SQUARE_EMOJI=new Set([0x25fb,0x25fc,0x25fd,0x25fe,0x267f,0x2705,0x274e,0x2b1b,0x2b1c,0x1f3a6,0x1f4f6,0x1f520,0x1f521,0x1f522,0x1f523,0x1f524,0x1f532,0x1f533,0x1f6ae,0x1f6b0,0x1f6b9,0x1f6ba,0x1f6bb,0x1f6bc,0x1f6be,0x1f6c2,0x1f6c3,0x1f6c4,0x1f6c5]);
export function emojiPlateShape(char){
 const points=[...char].map(value=>value.codePointAt(0)).filter(value=>value!==0xfe0f&&value!==0xfe0e);
 if(points.includes(0x20e3))return 'square';
 const code=points[0];if(CIRCLE_EMOJI.has(code))return 'circle';
 if(SQUARE_EMOJI.has(code)||(code>=0x1f170&&code<=0x1f19a)||(code>=0x1f200&&code<=0x1f2ff)||(code>=0x1f7e5&&code<=0x1f7eb))return 'square';
 return null;
}
const catalogEmoji=new Set(EMOJI);
export const isDeviceDependentCharacter=char=>catalogEmoji.has(char)||/\p{Emoji_Presentation}|\p{Regional_Indicator}|\ufe0f|\u20e3/u.test(char);
export const isEmojiCharacter=char=>Boolean(emojiPlateShape(char))||isDeviceDependentCharacter(char);

// Text-style enclosed symbols may render as black font ink rather than a color
// emoji. Preserve genuine emoji palettes, including black/white emoji artwork.
export function tintableSymbolRaster(char,imageData){
 if(isDeviceDependentCharacter(char)||!emojiPlateShape(char))return false;
 const pixels=imageData.data;let ink=false;
 for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>=48){ink=true;if(Math.max(pixels[i],pixels[i+1],pixels[i+2])-Math.min(pixels[i],pixels[i+1],pixels[i+2])>8)return false;}
 return ink;
}
