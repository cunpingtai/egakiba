/** R3 local campaign catalog. Immutable IDs, intentionally versioned for future verified leaderboards. */
export const CAMPAIGN_VERSION = 'campaign-r3a';
export const CHAPTERS = Object.freeze([
  { id: 1, title: 'ノートのはじまり', subtitle: 'うごかして、たたかって、まもろう', accent: '#87cbd7' },
  { id: 2, title: 'らくがき大乱闘', subtitle: '間合いとスピードで勝負！', accent: '#f0c56d' },
  { id: 3, title: 'インクの王国', subtitle: 'キミのラクガキで最後の挑戦へ', accent: '#d4b5e8' },
]);
const shape=(mass,limbCount,limbReach,slenderness)=>({mass,limbCount,limbReach,slenderness});
const define=(id,chapter,name,description,style,features,parTicks,avatar,color,tip,boss=false)=>({
  id,chapter,name,description,style,features,parTicks,avatar,color,tip,boss,
  seconds:90, arena:chapter===1?'school-note':chapter===2?'colored-note':'ink-palace',
  predecessor: id==='1-1'?null: (Number(id.split('-')[1])===1 ? `${chapter-1}-4` : `${chapter}-${Number(id.split('-')[1])-1}`),
  contentVersion:CAMPAIGN_VERSION,
});
export const LEVELS=Object.freeze([
  define('1-1',1,'うごくまる','はじめての一歩','beginner',shape(.60,.22,.30,.15),3000,'blob','#86c8d8','WASD / スティックで近づこう。'),
  define('1-2',1,'せっかちネコ','攻撃のリズム','aggressive',shape(.38,.62,.46,.56),2600,'cat','#f4a4a0','攻撃が終わったら、反撃のチャンス！'),
  define('1-3',1,'ガード博士','守りの練習','defensive',shape(.72,.36,.45,.14),2850,'robot','#eecb71','長押し攻撃でガードをくずそう。'),
  define('1-4',1,'ノートの番人','最初のボス','defensive',shape(.75,.55,.55,.26),3300,'guardian','#df94a6','予告を見てガード、隙を狙って攻撃！',true),
  define('2-1',2,'はやあしウサギ','スピードを見きわめろ','retreating',shape(.24,.68,.37,.78),2850,'rabbit','#bca5ed','追いかけすぎず、敵の戻りを待とう。'),
  define('2-2',2,'ながうでくん','なが〜いリーチ','circling',shape(.29,.50,.90,.78),3000,'longarms','#91c7a1','相手の長い手が届く前に、横へ動こう。'),
  define('2-3',2,'くるくるタコ','まわりこみ対決','circling',shape(.53,.92,.70,.32),3150,'octopus','#f3a4be','相手を見失わないようにしよう。'),
  define('2-4',2,'インクのおばけ','第二章のボス','retreating',shape(.64,.86,.64,.31),3450,'ghost','#aab4e8','近づいて一撃、深追いは禁物！',true),
  define('3-1',3,'トゲトゲライバル','攻めが強い！','aggressive',shape(.32,.80,.69,.65),3000,'spiky','#ed9f78','連続攻撃を受け止めたら反撃！'),
  define('3-2',3,'カウンターの達人','ジャストガード','defensive',shape(.58,.56,.56,.48),3250,'samurai','#e8bd78','相手が動き出す瞬間にガード。'),
  define('3-3',3,'さいごの特訓','総合チャレンジ','circling',shape(.48,.75,.65,.59),3300,'star','#f1d371','スタミナがゼロにならないように。'),
  define('3-4',3,'インクの王','さいごのボス','aggressive',shape(.62,.86,.79,.45),3900,'king','#b99bdf','予告のあとは強力な攻撃。見きわめよう！',true),
]);
export const LEVEL_BY_ID=new Map(LEVELS.map(level=>[level.id,level]));
export function getLevel(id){return LEVEL_BY_ID.get(id)||null;}
export function nextLevel(id){const i=LEVELS.findIndex(x=>x.id===id);return i<0?null:LEVELS[i+1]||null;}
export function validateCampaign(){
  if(LEVELS.length!==12 || CHAPTERS.length!==3)throw Error('Expected 12 levels and 3 chapters');
  const seen=new Set();
  for(const level of LEVELS){
    if(seen.has(level.id))throw Error('Duplicate level');seen.add(level.id);
    if(level.predecessor&&!seen.has(level.predecessor))throw Error('Invalid level predecessor '+level.id);
    if(level.parTicks<=0||level.parTicks>level.seconds*60)throw Error('Invalid par time '+level.id);
    for(const value of Object.values(level.features))if(value<0||value>1)throw Error('Invalid features '+level.id);
  }
  return true;
}
validateCampaign();
