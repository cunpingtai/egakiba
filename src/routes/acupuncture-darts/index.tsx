import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { HariBlocks, HariNav } from '../../acupuncture-darts/Article'
import { getHariPage, hariHead, hariHref } from '../../acupuncture-darts/seo'

const page = getHariPage('home')
if (!page) throw new Error('鍼ダーツ home copy is missing')

export const Route = createFileRoute('/acupuncture-darts/')({
  ssr: true,
  head: () => hariHead(page),
  component: HariHome,
})

function HariHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <HariBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="鍼ダーツ"
          src={hariHref('game.html')}
          style={{ display: 'block', width: '100%', border: 0, background: '#efe4d2' }}
        />
        <div className="rf-seo-copy">
          <HariBlocks blocks={rest} />
          <HariNav current="home" />
        </div>
      </article>
    </main>
  )
}
