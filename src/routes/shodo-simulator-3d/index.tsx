import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { ShodoBlocks, ShodoNav } from '../../shodo-simulator-3d/Article'
import { getShodoPage, shodoHead, shodoHref } from '../../shodo-simulator-3d/seo'

const page = getShodoPage('home')
if (!page) throw new Error('Shodo Simulator home copy is missing')

export const Route = createFileRoute('/shodo-simulator-3d/')({
  ssr: true,
  head: () => shodoHead(page),
  component: ShodoHome,
})

function ShodoHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <ShodoBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="書道シミュレーター3D"
          src={shodoHref('game.html')}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#2b2622' }}
        />
        <div className="rf-seo-copy">
          <ShodoBlocks blocks={rest} />
          <ShodoNav current="home" />
        </div>
      </article>
    </main>
  )
}
