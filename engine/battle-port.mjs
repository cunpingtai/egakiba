/** Engine seam for substituting the real glyph-collider simulation.
 * The engine contracts intentionally have no DOM/canvas/network dependencies.
 */
export const BATTLE_PORT_VERSION=1;
/**
 * Shape of a BattleSimulation adapter:
 *  - create({glyphRefs, fontAssetHashes, actions, arena, seed, rulesVersion})
 *  - stepFixed(): events[]  / called with 1/60 fixed step
 *  - snapshot(): {tick,tops:[{glyph,x,y,angle,hp,spin}],done,result}
 *  - result(): authoritative local result, or null
 *  - dispose()
 *
 * Production adapter must use the SAME bundled outline for both preview and collisions.
 * Multi-player server re-simulation must replace any client-defined glyph stats.
 */
export function assertBattlePort(instance){
 for(const name of ['stepFixed','snapshot','dispose'])if(typeof instance?.[name]!=='function')throw new Error(`Missing combat adapter: ${name}`);
 return instance;
}
/** Adapter for the R3 standalone sample; no claim of V2 physics compatibility. */
export function referenceAdapter(sim){assertBattlePort({stepFixed:()=>sim.step(),snapshot:()=>sim.snapshot(),dispose:()=>{}});return {stepFixed:()=>sim.step(),snapshot:()=>sim.snapshot(),result:()=>sim.result,dispose:()=>{}};}
