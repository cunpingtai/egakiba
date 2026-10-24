/** Fail-closed gate. No R7 client result, replay or candidate asset is competitive proof.
 * Real ranked scoring must be a future server-only service with authenticated
 * identity, canonical data + pinned version and independently simulated actions.
 */
export const COMPETITIVE_POLICY='server-validated-v1-not-implemented';
export function getCompetitiveReadiness({assetStatus=null,ruleset=null,identity=null,serverVerification=null}={}){
 const blockers=[];
 if(assetStatus?.source!=='server-approved-pack')blockers.push('NO_SERVER_APPROVED_ASSETS');
 if(ruleset?.id!=='production-physics-v1'||ruleset?.serverCompatible!==true)blockers.push('NO_PRODUCTION_PHYSICS');
 if(identity?.authenticated!==true)blockers.push('NO_AUTHENTICATED_PLAYER');
 if(serverVerification?.authoritative!==true)blockers.push('NO_SERVER_VERIFIER');
 // The production server is not implemented in R7. No browser-provided flags bypass it.
 blockers.push('RANKED_SERVER_NOT_DEPLOYED');
 return Object.freeze({eligible:false,blockers,policy:COMPETITIVE_POLICY});
}
export function assertCanSubmitRankedResult(){throw Error('Competitive submissions unavailable until a server-authoritative service is implemented');}
