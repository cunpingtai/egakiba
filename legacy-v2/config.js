const TOP_SCALE = 1.24;
const GLYPH_THICKNESS = .16 * 1.18;
const ARENA_RADIUS = 6.5;
const RIM_HEIGHT = .9;
const RIM_ANGLE = 89 * Math.PI / 180;
export const PHYSICS_VERSION = 'moji-blade-rapier021-r16-app-inner1';
export const CONFIG = Object.freeze({
  topScale: TOP_SCALE, fontSize: 1.8 * TOP_SCALE, thickness: GLYPH_THICKNESS, density: 5, curveTolerance: .003,
  tipRadius: .075 * TOP_SCALE, tipLength: .62 * TOP_SCALE, tipDensity: 4,
  arenaRadius: ARENA_RADIUS, bowlDepth: .9, rimHeight: RIM_HEIGHT,
  rimAngle: RIM_ANGLE, rimStart: 1-(RIM_HEIGHT/Math.tan(RIM_ANGLE))/ARENA_RADIUS, spawnRadius: 2.8,
  cameraHeight: 12.5, cameraDistance: 12.5,
  sparkCapacity: 160, sparkCount: 34, sparkExtraCount: 22,
  impactStrongThreshold: .45, impactShake: 1, impactShakeDecay: 8.5,
  shockwaveDuration: .32, shockwaveMaxScale: 4.2, criticalShockwaveScale: 1.5,
  impactVibrationMin: 9, impactVibrationMax: 22,
  // Fast presentation, with the same small physical time step to preserve collision accuracy.
  step: 1 / 240, debrisStep: 1 / 120, simulationRate: 2.1, maxFrame: .1, timeLimit: 45,
  linearEnergy: 10.63125 * TOP_SCALE ** 3, spinEnergy: 65 * TOP_SCALE ** 5,
  spinSpeedMin: .85, spinSpeedMax: 1.35, dragTorque: .09 * TOP_SCALE ** 5, airDrag: .0004,
  floorFriction: .012, bodyFriction: .008, restitution: .04, floorRestitution: .02,
  wallReboundRetention: .50, wallImpactCooldown: .12,
  impactReboundBase: .42, impactPowerInfluence: .10, impactMaxReboundSpeed: 3, impactMinReboundSpeed: .75, impactMaxLiftSpeed: 1,
  impactSpinRetention: .94, resultDelay: 1.25, ringOutResultDelay: .45, ringOutInset: .18,
  criticalTipRadius: .24, criticalSharpTipRadiusBonus: .05, criticalContourSearchRadius: .34,
  criticalMaxCornerAngle: 100*Math.PI/180, criticalSharpCornerAngle: Math.PI/2,
  criticalMinForce: 24, criticalMinTipSpeed: 10, criticalSharpTipSpeedBonus: 2, criticalSpinDrain: .08, criticalTiltKick: 2.2, criticalKnockback: .56, criticalLift: .2,
  uprightReturnRate: 3.8, uprightDamping: 11, uprightGyroStart: 18, uprightGyroFull: 48, uprightGyroBoost: 1.20,
  uprightFadeAngle: 45*Math.PI/180, uprightMaxAngle: 75*Math.PI/180,
  statMassMin: .10 * TOP_SCALE ** 3, statMassMax: 1.65 * TOP_SCALE ** 3,
  statTipWeight: .15, statTipReference: 8, statBalanceAreaWeight: .8, statBalanceAreaSensitivity: 6,
  stopRate: Math.PI, stopDuration: .2, tipAngle: 70 * Math.PI / 180,
  tipDuration: .55, gracePeriod: 1,
});
export function characterKind(char) {
  if (/^[A-Za-z]$/.test(char)) return 'latin';
  if (/^[0-9]$/.test(char)) return 'digit';
  if (/^\p{Script=Hiragana}$/u.test(char)) return 'hiragana';
  if (/^\p{Script=Katakana}$/u.test(char) || char === 'ー') return 'katakana';
  if (/^\p{Unified_Ideograph}$/u.test(char)) return 'kanji';
  return null;
}
export function firstCharacter(raw) {
  const trimmed = raw.trimStart();
  const grapheme = new Intl.Segmenter('ja', {granularity:'grapheme'}).segment(trimmed)[Symbol.iterator]().next().value?.segment || '';
  if (!grapheme) return '';
  // NFC composes combining marks without replacing compatibility glyphs.
  // This preserves ㊙️, ㍿, half-width kana and full-width Latin characters.
  return grapheme.normalize('NFC');
}
export function validateCharacter(raw, regulation = 'mixed', supports = () => true) {
  const char = firstCharacter(raw);
  if (!char) throw new Error('回す文字を入力してください。');
  if (!supports(char)) throw new Error('選んだフォントにこの文字はありません。別の文字を試してください。');
  return char;
}
// Enumerate every outlined character in the selected font. Keep compatibility
// glyphs distinct so symbols such as ㍿ can also be selected at random.
export function buildCharacterPools(codePoints, supports) {
  const pools={all:[],kanji:[],nonKanji:[],hiragana:[],katakana:[],latin:[],digit:[],alphanumeric:[]},seen=new Set();
  for(const code of codePoints){
    const char=String.fromCodePoint(Number(code)).normalize('NFC');
    if([...char].length!==1||seen.has(char))continue;
    const kind=characterKind(char);
    if(!supports(char))continue;
    seen.add(char);pools.all.push(char);
    if(kind==='kanji')pools.kanji.push(char);else pools.nonKanji.push(char);
    if(!kind||kind==='kanji')continue;
    pools[kind].push(char);
    if(kind==='latin'||kind==='digit')pools.alphanumeric.push(char);
  }
  return pools;
}
export function randomCharacter(regulation, pools, random = Math.random) {
  const preferKanji=random()<.5;
  const preferred=preferKanji?pools.kanji:pools.nonKanji;
  const pool=preferred?.length?preferred:pools.all;
  if(!pool?.length)throw new Error('このフォントには選べる文字がありません。');
  return pool[Math.floor(random()*pool.length)];
}
export function shuffled(items,random=Math.random){
 const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;
}
export function bowlHeight(radius) {
  const r = Math.min(radius / CONFIG.arenaRadius, 1);
  // The broad bowl stays gentle; the final segment is a near-vertical wall.
  const wall=Math.max(0,(r-CONFIG.rimStart)/(1-CONFIG.rimStart));
  return CONFIG.bowlDepth * r * r + CONFIG.rimHeight * wall;
}

export const COM_LEVELS = Object.freeze({
  weak: {minPower:.30,maxPower:.55,spread:1.1},
  normal: {minPower:.65,maxPower:.85,spread:.30},
  strong: {minPower:1,maxPower:1,spread:.06},
});
export function createComLaunch(level='normal',random=Math.random){
 const config=COM_LEVELS[level]||COM_LEVELS.normal;
 return {angle:(random()*2-1)*config.spread,power:config.minPower+random()*(config.maxPower-config.minPower)};
}
export function statGauges(metrics){
 // Fixed across fonts: practical light/heavy mass bounds span the whole meter.
 // sqrt(mass) follows launch momentum at equal energy, with speed trading off.
 const low=Math.sqrt(CONFIG.statMassMin),high=Math.sqrt(CONFIG.statMassMax);
 const massPower=Math.max(0,Math.min(1,(Math.sqrt(Math.max(0,metrics.mass))-low)/(high-low)));
 const tips=Math.max(0,Math.min(1,(metrics.tips??0)/CONFIG.statTipReference));
 const power=massPower*(1-CONFIG.statTipWeight)+tips*CONFIG.statTipWeight;
 return {speed:1-massPower,power,balance:Math.max(0,Math.min(1,metrics.balance))};
}
