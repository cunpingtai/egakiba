// @ts-nocheck
let booted = false

export async function bootR9() {
  if (booted) return
  booted = true
  await import('../../app.js')
  await import('../../r2-flow.js')
  await import('../../r8-classic-screen.mjs')
  await import('../../r8-classic-stats.mjs')
  await import('../../r9-story-screen.mjs')
  await import('../../r9-story-stats.mjs')
  await import('../../glyph-compare-r10.mjs')
}
