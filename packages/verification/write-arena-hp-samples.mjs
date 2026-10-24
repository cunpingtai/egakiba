import { readFile, writeFile } from 'node:fs/promises'
import { summarizeArenaHp } from '../game-rules/arena-hp-draft.mjs'

const golden = JSON.parse(await readFile(new URL('../../docs/v3/m0/legacy-battle-results.json', import.meta.url), 'utf8'))
const samples = {
  status: 'draft-not-calibrated',
  ruleset: 'arena-hp-v3.0.0-draft',
  note: 'HP traces use arena-hp-v3.0.0-draft.2. forceUnit is round(batch median force / 12) from docs/v3/m3/arena-hp-contact-batch.json. This is a sample scale, not a balanced ruleset. Classic results are not replaced.',
  cases: golden.cases.map(summarizeArenaHp),
}
await writeFile(new URL('../../docs/v3/m3/arena-hp-draft-samples.json', import.meta.url), `${JSON.stringify(samples, null, 2)}\n`)
console.log(samples.cases.map((item) => `${item.id} classic=${item.classic.reason}@${item.classic.tick} hp=${item.arena.hp.join('/')} ended=${item.arena.ended?.reason ?? 'none'}`).join('\n'))
