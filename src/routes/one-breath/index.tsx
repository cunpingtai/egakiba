import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { BreathBlocks, BreathNav } from '../../one-breath/Article'
import { breathHead, breathHref, getBreathPage } from '../../one-breath/seo'

const page = getBreathPage('home')
if (!page) throw new Error('One Breath home copy is missing')

export const Route = createFileRoute('/one-breath/')({
  ssr: true,
  head: () => breathHead(page),
  component: BreathHome,
})

function BreathHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <BreathBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="一息で何歳まで"
          src={breathHref('game.html')}
          allow="microphone"
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#0b0809' }}
        />
        <div className="rf-seo-copy">
          <BreathBlocks blocks={rest} />
          <BreathNav current="home" />
        </div>
      </article>
    </main>
  )
}
