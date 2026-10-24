import {CONFIG} from './config.js';
import {getStage,boostBoardPoint} from './stages.js';
const enemy=(char,size=1,extra={})=>Object.freeze({char,size,...extra});
const stage=(id,scale,extra={})=>Object.freeze({id,name:'ハロウィン',halloween:true,surfaceScale:scale,radius:CONFIG.arenaRadius*scale,baseStage:getStage(extra.acceleration?'boost-bowl':'standard'),pads:[],...extra});
export const HALLOWEEN_BATTLES=Object.freeze([
 {name:'かぼちゃの庭',stage:stage('halloween-pumpkins',1,{props:Array.from({length:4},(_,i)=>({kind:'pumpkin',size:1.2,x:4.5*Math.cos(Math.PI/4+i*Math.PI/2),z:4.5*Math.sin(Math.PI/4+i*Math.PI/2)}))}),enemies:[enemy('🎃')]},
 {name:'蜘蛛の巣',stage:stage('halloween-webs',1,{webs:[{x:0,z:0,radius:4.2}]}),enemies:[enemy('🕷️',1.2,{webImmune:true})]},
 {name:'墓場',stage:stage('halloween-graves',1.2,{props:[{kind:'grave',x:0,z:0},...Array.from({length:16},(_,i)=>({kind:'grave',x:(i%4-1.5)*3.2,z:i<8?Math.floor(i/4)*2-1:i<12?-4.6:4.6})).filter(p=>Math.abs(p.x)>2||Math.abs(p.z)>2)]}),enemies:[enemy('👻',.8),enemy('👻',.8)]},
 {name:'お菓子の加速床',stage:stage('halloween-candy',1.2,{boost:Object.freeze({...getStage('boost-bowl').boost,multiplier:1.6,minLaunchRatio:.9,maxLaunchRatio:1.6}),pads:Array.from({length:8},(_,i)=>Object.freeze({angle:i*Math.PI/4+Math.PI/8,headingOffset:Math.PI/2-35*Math.PI/180,halfAngle:0,innerRadius:4,outerRadius:5.8,width:.85}))}),enemies:[enemy('🍬',.8),enemy('🍭',.8),enemy('🍫',.8)]},
 {name:'月夜の決戦',stage:stage('halloween-moon',1.3,{floorColor:0xdcc9ee,rimColor:0x9061bd,fitArena:true,fitMargin:.96,fitMarginLandscape:.91}),enemies:[enemy('🌝',2,{rare:true,spinMultiplier:5,speedMultiplier:.1,powerMultiplier:2}),enemy('🦇',.8),enemy('🧙‍♀️',.8),enemy('💀',.8)]},
].map(b=>Object.freeze({...b,enemies:Object.freeze(b.enemies)})));
export function bossSpawns(index){
 if(index===4){const player={x:0,z:2.8};return [player,{x:0,z:-5.4},...Array.from({length:3},(_,i)=>{const angle=-Math.PI/2+Math.PI/3+i*Math.PI*2/3;return {x:player.x+3.7*Math.cos(angle),z:player.z+3.7*Math.sin(angle)};})];}
 if(index===3)return [{x:0,z:3.2},{x:-3.2,z:0},{x:0,z:-3.2},{x:3.2,z:0}];
 const battle=HALLOWEEN_BATTLES[index],n=battle.enemies.length;
 const enemyPoints=n===1?[[0,-2.8]]:n===2?[[-2.6,-2.8],[2.6,-2.8]]:n===3?[[-3.7,-2],[0,-4.2],[3.7,-2]]:[[0,-5.4],[-4.2,-1.8],[4.2,-1.8],[0,-.9]];
 return [{x:0,z:2.8},...enemyPoints.map(([x,z])=>({x,z}))];
}
export function resolveBossLosses(losses,time){
 const enemiesDown=losses.length>1&&losses.slice(1).every(Boolean);
 // A simultaneous player defeat is not a clear; every stage must be won.
 if(losses[0])return {winner:1,reason:losses[0],losses};
 if(enemiesDown)return {winner:0,reason:'全員撃破',losses};
 if(time>=CONFIG.timeLimit)return {winner:null,reason:'時間切れ',losses};
 return null;
}
export function createBossRun(){
 let index=0,status='ready';
 return {get index(){return index;},get status(){return status;},get battle(){return HALLOWEEN_BATTLES[index];},launch(){if(status!=='ready')return false;status='battle';return true;},settle(result){if(status!=='battle'||!result||![0,1,null].includes(result.winner))return false;status=result.winner===0?(index===4?'clear':'won'):'lost';return true;},next(){if(status!=='won')return false;index++;status='ready';return true;},retry(){if(!['lost','clear'].includes(status))return false;index=0;status='ready';return true;}};
}
// A battle-owned appearance/collision variant. The library's cached glyph stays intact.
export function scaleBossGlyph(base,scale){
 if(scale===1)return base;
 const point=p=>({...p,x:p.x*scale,y:p.y*scale}),geometry=base.geometry.clone();geometry.scale(scale,1,scale);geometry.computeBoundingSphere();
 return {...base,geometry,parts:base.parts.map(poly=>poly.map(point)),triangles:base.triangles.map(tri=>tri.map(point)),tipPoints:base.tipPoints?.map(point),criticalTipPoints:base.criticalTipPoints?.map(point),centroid:point(base.centroid),area:base.area*scale*scale,radius:geometry.boundingSphere.radius,textureScale:base.textureScale*scale,bossOwned:true,bossBaseGlyph:base};
}

export function bossBoardAim(stage,position,player=false){if(stage.id!=='halloween-candy')return null;let target=null,distance=Infinity;for(const pad of stage.pads){const point=boostBoardPoint(pad,.5),d=(point.x-position.x)**2+(point.z-position.z)**2;if(d<distance-1e-9){distance=d;target=point;}}return target?Math.atan2(target.x-position.x,(player?-1:1)*(target.z-position.z)):null;}

// Keep the specified boss size; reuse the common rare stats and foil via rare/baseGlyph.
export function bossEnemyGlyph(base,enemy){const scaled=scaleBossGlyph(base,enemy.size);return enemy.rare?{...scaled,rare:true,baseGlyph:scaled}:scaled;}
