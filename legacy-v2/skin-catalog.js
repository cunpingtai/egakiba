import {HALLOWEEN_SKINS,halloweenSkinIcon,halloweenGlyphPaint} from './halloween-skins.js';
// Stable IDs are save-data keys. Append new/event skins; never reuse an ID.
// Named colours mix hue, lightness and saturation for a readable game palette.
const ordinary=[
 ['blue','ブルー','#3578ed'],
 ['red','レッド','#e04c3d'],
 ['orange','オレンジ','#ff9b35'],
 ['yellow','イエロー','#ffda4a'],
 ['lime','ライム','#a8db44'],
 ['green','グリーン','#2fbc65'],
 ['mint','ミント','#78dfb7'],
 ['cyan','シアン','#22c9dc'],
 ['sky','スカイ','#8dcdf4'],
 ['navy','ネイビー','#344b98'],
 ['violet','バイオレット','#8054cb'],
 ['pink','ピンク','#f4a0c4'],
 ['rose','マゼンタ','#cf3e91'],
 ['coral','コーラル','#ff9a82'],
 ['brown','ブラウン','#a36e46'],
 ['sand','サンド','#e9cd97'],
 ['white','ホワイト','#f5f4ec'],
 ['light-grey','ライトグレー','#c8d0d9'],
 ['grey','グレー','#929ba8'],
 ['black','ブラック','#303846']
];
// Fixed inventory display order. Append future rewards here; do not sort by receipt.
export const RAINBOW_COLORS=Object.freeze(['#fa3e66','#ff9433','#ffdf4d','#20ce77','#18cadd','#3c65f5','#a23deb']);
const rainbowPaint=['#fa3e66','#fc694c','#ff9433','#ffba40','#ffdf4d','#90d662','#20ce77','#1cccaa','#18cadd','#2a98e9','#3c65f5','#6f51f0','#a23deb','#ce3ea8','#fa3e66','#fc694c','#ff9433','#ffba40','#ffdf4d','#90d662','#20ce77','#1cccaa'];
const special=[
 ['gold','ゴールド','#f1be45','kanji',.85,.075,['#b77916','#ffd364','#d99a27']],
 ['pearl','ブロンズ','#c77c48','hiragana',.88,.085,['#854827','#d69b62','#a85a2b']],
 ['silver','シルバー','#bbc5d2','katakana',.96,.045,['#606c7e','#ffffff','#939eaf']],
 ['sapphire','サファイア','#1451c0','alphanumeric',.04,.065,['#183c8e','#71c6ff','#234eb3']],
 ['obsidian','エメラルド','#12a66a','symbol',.04,.065,['#096741','#21c884','#0b8159']],
 ['candy','ルビー','#ce1746','emoji',.04,.065,['#7e0b2a','#ee3862','#aa1137']],
 ['aurora','ダイヤモンド','#00b8d0','other',.28,.06,['#007c96','#43dfed','#0099b8']],
 ['rainbow','プリズムレインボー','#a23deb','',.68,.07,rainbowPaint]
];
export const BASIC_SKINS=Object.freeze(ordinary.map(([id,name,color])=>Object.freeze({id,name,color,kind:'plain',metalness:.12,roughness:.33})));
export const REWARD_SKINS=Object.freeze(special.map(([id,name,color,category,metalness,roughness,colors])=>Object.freeze({id,name,color,category,kind:id,metalness,roughness,colors:Object.freeze(colors)})));
export const EVENT_SKINS=HALLOWEEN_SKINS;
export const SKINS=Object.freeze([...BASIC_SKINS,...REWARD_SKINS,...EVENT_SKINS]);
const byId=new Map(SKINS.map(skin=>[skin.id,skin]));
export const skinById=id=>byId.get(id)||null;
export const rewardSkin=category=>REWARD_SKINS.find(skin=>skin.category===category)||null;
export const skinPaint=skin=>halloweenSkinIcon(skin)||(skin?.colors?`linear-gradient(110deg,${skin.colors.join(',')})`:skin?.color||'#3578ed');
export function applySkinVariables(element,skin){
 if(!element)return;const valid=skin&&skinById(skin.id);element.dataset.skin=valid?skin.id:'';
 if(valid){element.style?.setProperty?.('--skin-color',skin.color);element.style?.setProperty?.('--skin-paint',skinPaint(skin));}
 else{element.style?.removeProperty?.('--skin-color');element.style?.removeProperty?.('--skin-paint');}
}
export function applySkinGlyph(element,skin){applySkinVariables(element,skin);if(element){element.dataset.skinGradient=String(Boolean(skin?.colors));const pattern=halloweenGlyphPaint(skin);if(pattern)element.style?.setProperty?.('--skin-paint',pattern);}}
