// Only Google Play's per-user availability may unlock the update action.
const KEY='tsukuruum.moji-blade.update-notice.v1';
export function availableUpdate(value){
 return value?.status==='available'&&Number.isSafeInteger(value.currentVersionCode)&&value.currentVersionCode>0&&Number.isSafeInteger(value.availableVersionCode)&&value.availableVersionCode>value.currentVersionCode;
}
export function createUpdateNotice({check,storage,now=()=>Date.now(),onChange=()=>{}}){
 let info=null,status='unknown',pending=null,nextCheck=-Infinity,prompted=0,snooze=null;
 try{const value=JSON.parse(storage?.getItem(KEY)||'null');if(Number.isSafeInteger(value?.version)&&Number.isFinite(value?.until))snooze=value;}catch{}
 const state=()=>({available:availableUpdate(info),info,status});
 return {
  state,
  check(force=false){
   if(pending)return pending;
   if(!force&&now()<nextCheck)return Promise.resolve(state());
   nextCheck=now()+60000;
   pending=Promise.resolve().then(check).then(value=>{
    if(availableUpdate(value)||value?.status==='current')nextCheck=now()+6*60*60*1000;
    if(availableUpdate(value)){info=value;status='available';}
    else if(value?.status==='current'){info=null;status='current';}
    else status='error';
    // A temporary error cannot erase a previously confirmed update.
    onChange(state());return state();
   }).catch(()=>{status='error';onChange(state());return state();}).finally(()=>{pending=null;});
   return pending;
  },
  shouldPrompt(){return availableUpdate(info)&&prompted!==info.availableVersionCode&&!(snooze?.version===info.availableVersionCode&&snooze.until>now());},
  prompted(){if(availableUpdate(info))prompted=info.availableVersionCode;},
  dismiss(){
   if(!availableUpdate(info))return;
   prompted=info.availableVersionCode;
   const tomorrow=new Date(now());tomorrow.setHours(24,0,0,0);
   snooze={version:info.availableVersionCode,until:tomorrow.getTime()};
   try{storage?.setItem(KEY,JSON.stringify(snooze));}catch{}
  }
 };
}
