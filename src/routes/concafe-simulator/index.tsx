import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { CafeBlocks, CafeNav } from '../../concafe-simulator/Article'
import { concafeHead, concafeHref, getCafePage } from '../../concafe-simulator/seo'

const page = getCafePage('home')
if (!page) throw new Error('コンカフェ嬢シミュレーター home copy is missing')

export const Route = createFileRoute('/concafe-simulator/')({
  ssr: true,
  head: () => concafeHead(page),
  component: CafeHome,
})

function CafeHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <CafeBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="コンカフェ嬢シミュレーター"
          src={concafeHref('game.html')}
          style={{ display: 'block', width: '100%', border: 0, background: '#170e1d' }}
        />
        <div className="rf-seo-copy">
          <CafeBlocks blocks={rest} />
          <CafeNav current="home" />
        </div>
      </article>
    </main>
  )
}
