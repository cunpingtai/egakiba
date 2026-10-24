import {characterKind} from './config.js';
const categoryCache=new Map();
export function characterCategory(glyph){if(!categoryCache.has(glyph))categoryCache.set(glyph,categoryOf(glyph));return categoryCache.get(glyph);}
function categoryOf(glyph){
 const kind=characterKind(glyph);
 if(kind==='kanji')return 'kanji';if(kind==='hiragana'||kind==='katakana')return kind;
 if(/^[\p{Script=Latin}\p{N}]+$/u.test(glyph))return 'alphanumeric';
 if(/\p{Emoji_Presentation}|\uFE0F|\u200D|\p{Regional_Indicator}/u.test(glyph))return 'emoji';
 if(/^[\p{S}\p{P}]+$/u.test(glyph))return 'symbol';return 'other';
}
