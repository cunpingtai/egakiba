// Shared by the browser and API. Each event owns an independent rating pool.
export const EVENT_ID='hiragana-1-gp';
export const EVENT_TITLE='ひらがな-1 GP';
const missing={gothic:new Set(['ゕ','ゖ']),mincho:new Set(),pop:new Set(),brush:new Set(['ゔ','ゕ','ゖ'])};
export function isEventCharacter(value,font){
 const glyph=String(value||'').normalize('NFC');
 return /^[\u3041-\u3096]$/u.test(glyph)&&Object.hasOwn(missing,font)&&!missing[font].has(glyph);
}
