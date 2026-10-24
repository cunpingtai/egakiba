/** Offline verifier for R6 *experimental* local replay capsules.
 * Usage: node scripts/verify_replay.mjs path/to/file.json
 * A passing check proves internal consistency only, NEVER competitive authenticity.
 */
import {readFileSync} from 'node:fs';
import {verifyBattleReplay} from '../engine/replay-v6.mjs';
const path=process.argv[2];
if(!path){console.error('Usage: node scripts/verify_replay.mjs <local-replay.json>');process.exit(2);}
try{
 const raw=readFileSync(path,'utf8');
 if(Buffer.byteLength(raw)>220000)throw Error('Replay is too large');
 const value=JSON.parse(raw),result=verifyBattleReplay(value);
 console.log(JSON.stringify({status:'CONSISTENT_LOCAL_SIMULATION_ONLY',...result,notRanked:true},null,2));
}catch(error){console.error('REPLAY VERIFICATION FAILED:',error.message);process.exit(1);}
