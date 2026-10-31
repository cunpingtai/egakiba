import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { BakusoBlocks, BakusoNav } from '../../bakuso-kickboard/Article'
import { bakusoHead, bakusoHref, getBakusoPage } from '../../bakuso-kickboard/seo'

const page = getBakusoPage('home')
if (!page) throw new Error('爆走キックボード home copy is missing')

export const Route = createFileRoute('/bakuso-kickboard/')({
  ssr: true,
  head: () => bakusoHead(page),
  component: BakusoHome,
})

function BakusoHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <BakusoBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="爆走キックボード"
          src={bakusoHref('game.html')}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#0c1116' }}
        />
        <div className="rf-seo-copy">
          <BakusoBlocks blocks={rest} />
          <BakusoNav />
        </div>
      </article>
    </main>
  )
}
