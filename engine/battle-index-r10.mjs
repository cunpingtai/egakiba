/** An explanatory, local comparison index, not a matchmaking rating or predicted win rate. */
export const INDEX_VERSION='glyph-index-r10-1';
export const compareWeights=Object.freeze({story:Object.freeze({speed:.25,power:.32,hp:.23,balance:.20}),quick:Object.freeze({speed:.34,power:.36,hp:0,balance:.30})});
const bound=(n,maximum=100)=>Number.isFinite(n)?Math.max(0,Math.min(maximum,n)):0;
export function battleIndex(stats,mode='story'){
 if(!stats||!['story','quick'].includes(mode))throw new Error('Unsupported stats/rules');
 const weights=compareWeights[mode];
 const hp=mode==='story'?bound(stats.hp,110)/110*100:0;
 const result=weights.speed*bound(stats.speed)+weights.power*bound(stats.power)+weights.balance*bound(stats.balance)+weights.hp*hp;
 return Math.round(result);
}
export function statComparison(player,rival,mode='story'){
 const keys=mode==='quick'?['speed','power','balance']:['speed','power','hp','balance'];
 const result=keys.map(key=>({key,player:Number(player[key]),rival:Number(rival[key]),difference:Number(player[key])-Number(rival[key]),max:key==='hp'?110:100}));
 if(result.some(x=>!Number.isFinite(x.player)||!Number.isFinite(x.rival)))throw new Error('Missing stats');
 return result;
}
