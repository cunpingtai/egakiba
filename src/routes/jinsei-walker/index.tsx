import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { WalkerBlocks, WalkerNav } from '../../jinsei-walker/Article'
import { getWalkerPage, walkerHead, walkerHref } from '../../jinsei-walker/seo'

const page = getWalkerPage('home')
if (!page) throw new Error('Jinsei walker home copy is missing')

export const Route = createFileRoute('/jinsei-walker/')({
  ssr: true,
  head: () => walkerHead(page),
  component: WalkerHome,
})

function WalkerHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <WalkerBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="人生ウォーカー"
          src={walkerHref('game.html')}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#000' }}
        />
        <div className="rf-seo-copy">
          <WalkerBlocks blocks={rest} />
          <WalkerNav current="home" />
        </div>
      </article>
    </main>
  )
}
