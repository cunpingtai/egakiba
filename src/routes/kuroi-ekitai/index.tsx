import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { KuroBlocks, KuroNav } from '../../kuroi-ekitai/Article'
import { getKuroPage, kuroHead, kuroHref } from '../../kuroi-ekitai/seo'

const page = getKuroPage('home')
if (!page) throw new Error('黒い液体 home copy is missing')

export const Route = createFileRoute('/kuroi-ekitai/')({
  ssr: true,
  head: () => kuroHead(page),
  component: KuroHome,
})

function KuroHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <KuroBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="黒い液体"
          src={kuroHref('game.html')}
          style={{ display: 'block', width: '100%', border: 0, background: '#e8e3d8' }}
        />
        <div className="rf-seo-copy">
          <KuroBlocks blocks={rest} />
          <KuroNav current="home" />
        </div>
      </article>
    </main>
  )
}
