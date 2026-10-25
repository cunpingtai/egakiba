import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { PotatoBlocks, PotatoNav } from '../../long-potato/Article'
import { getPotatoPage, potatoHead, potatoHref } from '../../long-potato/seo'

const page = getPotatoPage('home')
if (!page) throw new Error('Potato home copy is missing')

export const Route = createFileRoute('/long-potato/')({
  ssr: true,
  head: () => potatoHead(page),
  component: PotatoHome,
})

function PotatoHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <PotatoBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="ぐるぐるポテトメーカー"
          src={potatoHref('game.html')}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#4a4540' }}
        />
        <div className="rf-seo-copy">
          <PotatoBlocks blocks={rest} />
          <PotatoNav current="home" />
        </div>
      </article>
    </main>
  )
}
