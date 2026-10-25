import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { OmuriceBlocks, OmuriceNav } from '../../omurice-simulator/Article'
import { getOmuricePage, omuriceHead, omuriceHref } from '../../omurice-simulator/seo'

const page = getOmuricePage('home')
if (!page) throw new Error('Omurice home copy is missing')

export const Route = createFileRoute('/omurice-simulator/')({
  ssr: true,
  head: () => omuriceHead(page),
  component: OmuriceHome,
})

function OmuriceHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <OmuriceBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="オムライスシミュレーター"
          src={omuriceHref('game.html')}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#1b1b1b' }}
        />
        <div className="rf-seo-copy">
          <OmuriceBlocks blocks={rest} />
          <OmuriceNav current="home" />
        </div>
      </article>
    </main>
  )
}
