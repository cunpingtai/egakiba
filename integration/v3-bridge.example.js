/**
 * Example host integration contract only. NOT A FUNCTIONAL BATTLE ENGINE.
 * Include AFTER the real V3 simulation, stage manifest, and glyph modules exist.
 * The R2 preview dispatches 'moji:v3-battle-request' and optionally calls
 * window.MojiBladeV3Bridge.launchStage(request).
 *
 * IMPORTANT: Never send an R2 prototype request directly to ranking endpoints.
 * The payload has null version identifiers and verified:false by design.
 */
window.MojiBladeV3Bridge={
  async launchStage(request){
    if(request?.source!=='R2-prototype')throw new Error('Unrecognized UI request');
    // 1. Resolve authenticated ruleset and level from your versioned V3 registry.
    // const level = await levelRepository.get(request.levelId);
    // 2. Validate glyph with bundled outline table; recompute calibrated stats.
    // const glyph = await glyphRepository.resolve(request.player.char,request.player.fontId);
    // 3. Obtain authoritative seed, ruleset and physics version. Do not trust R2 data.
    // const battleSetup = await battleFactory.create(level, glyph);
    // 4. Mount real ArenaView and start the real BattleStateMachine.
    // await appNavigation.enterBattle(battleSetup);
    // return {status:'started'};
    return {status:'not-implemented'};
  }
};
