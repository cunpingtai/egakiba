import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { DashimakiBlocks, DashimakiNav } from '../../dashimaki-game/Article'
import { dashimakiHead, dashimakiHref, getDashimakiPage } from '../../dashimaki-game/seo'

const page = getDashimakiPage('home')
if (!page) throw new Error('Dashimaki home copy is missing')

export const Route = createFileRoute('/dashimaki-game/')({
  ssr: true,
  head: () => dashimakiHead(page),
  component: DashimakiHome,
})

function DashimakiHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <DashimakiBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="だし巻き"
          src={dashimakiHref('game.html')}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#0d0b0a' }}
        />
        <div className="rf-seo-copy">
          <DashimakiBlocks blocks={rest} />
          <DashimakiNav current="home" />
        </div>
      </article>
    </main>
  )
}
