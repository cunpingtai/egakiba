import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { SoftServeBlocks, SoftServeNav } from '../../soft-serve/Article'
import { getSoftServePage, softServeHead, softServeHref } from '../../soft-serve/seo'

const page = getSoftServePage('home')
if (!page) throw new Error('Soft-serve home copy is missing')

export const Route = createFileRoute('/soft-serve/')({
  ssr: true,
  head: () => softServeHead(page),
  component: SoftServeHome,
})

function SoftServeHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <SoftServeBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="ソフトクリームシミュレーター"
          src={softServeHref('game.html')}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#fff8ec' }}
        />
        <div className="rf-seo-copy">
          <SoftServeBlocks blocks={rest} />
          <SoftServeNav current="home" />
        </div>
      </article>
    </main>
  )
}
