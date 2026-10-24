const CLASSIC_LOSS = {
  ringOut: '場外',
  tipped: '転倒',
  spinStopped: '回転停止',
  simultaneous: '同時決着',
  timeout: '時間切れ',
}

function point(value) {
  return { x: value.x, y: value.y, z: value.z }
}

export function mapClassicEndReason(reason) {
  switch (reason) {
    case CLASSIC_LOSS.ringOut:
      return 'ring-out'
    case CLASSIC_LOSS.spinStopped:
      return 'spin-exhausted'
    case CLASSIC_LOSS.simultaneous:
      return 'double-ko'
    case CLASSIC_LOSS.timeout:
      return 'timeout'
    case CLASSIC_LOSS.tipped:
      return null
    default:
      return null
  }
}

export function quantizeLegacyAction(action) {
  throw new Error(`V3 angleQ/powerQ scale is not frozen. Refusing angle ${action.angle}.`)
}

/**
 * Fixed-step view of a published Battle. Physics is unchanged.
 * `impulse` stays the normalized strength. `force` is the raw contact magnitude copied for the draft HP layer.
 * A tipped finish keeps classicReason `転倒` and leaves the V3 reason null.
 */
export function createLegacyBattleAdapter(battle) {
  const impacts = []
  const boosts = []
  const ropes = []
  const battleEvents = []
  let steps = 0

  function recordNewEvents() {
    for (let index = impacts.length; index < battle.events.length; index++) {
      const event = battle.events[index]
      const impact = {
        tick: steps,
        position: point(event.position),
        strength: event.strength,
        force: event.force,
        critical: Boolean(event.critical),
        criticalAttackers: [...(event.criticalAttackers ?? [])],
      }
      impacts.push(impact)
      battleEvents.push({
        type: 'collision',
        tick: impact.tick,
        a: 0,
        b: 1,
        impulse: impact.strength,
        critical: impact.critical,
      })
    }
    for (let index = boosts.length; index < battle.boostEvents.length; index++) {
      const event = battle.boostEvents[index]
      const boost = { tick: steps, index: event.index, position: point(event.position) }
      boosts.push(boost)
      battleEvents.push({ type: 'boost', tick: boost.tick, slot: boost.index, effectId: 'boost-board' })
    }
    for (let index = ropes.length; index < battle.ropeEvents.length; index++) {
      const event = battle.ropeEvents[index]
      ropes.push({
        tick: steps,
        phase: event.phase,
        side: event.side,
        otherSide: event.otherSide ?? null,
        position: point(event.position),
        width: event.width,
        depth: event.depth,
        amount: event.amount,
        speed: event.speed,
      })
    }
  }

  return {
    get running() {
      return battle.running
    },
    get steps() {
      return steps
    },
    get result() {
      return battle.result
    },
    stateHash() {
      return battle.stateHash()
    },
    launch(actions) {
      const launched = battle.launchPair(actions)
      if (!launched) return false
      battleEvents.push({
        type: 'classic-launch',
        tick: 0,
        actions: actions.map((action) => ({
          angle: action.angle,
          power: action.power,
          spinDirection: action.spinDirection === -1 ? -1 : 1,
        })),
      })
      return true
    },
    step() {
      battle.step()
      steps += 1
      recordNewEvents()
      return battleEvents
    },
    legacyEvents() {
      return { impacts, boosts, ropes }
    },
    battleEvents() {
      const finished = battleEvents.find((event) => event.type === 'finished')
      if (!battle.result || finished) return battleEvents
      const reason = mapClassicEndReason(battle.result.reason)
      for (const [slot, loss] of battle.result.losses.entries()) {
        if (loss === CLASSIC_LOSS.ringOut) battleEvents.push({ type: 'ring-out', tick: steps, slot })
      }
      battleEvents.push({
        type: 'finished',
        tick: steps,
        classicReason: battle.result.reason,
        reason,
        winner: battle.result.winner,
      })
      return battleEvents
    },
    dispose() {
      battle.dispose()
    },
  }
}
