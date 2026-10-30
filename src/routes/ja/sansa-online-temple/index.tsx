import { createFileRoute } from '@tanstack/react-router'

import '../../../../draw-fight/src/notebook/seo.css'
import { SansaBlocks, SansaNav } from '../../../sansa/Article'
import { getSansaPage, sansaHead, sansaHref } from '../../../sansa/seo'

const page = getSansaPage('ja', 'home')
if (!page) throw new Error('sansa ja home is missing')

export const Route = createFileRoute('/ja/sansa-online-temple/')({
  ssr: true,
  head: () => sansaHead('ja', page),
  component: SansaHome,
})

function SansaHome() {
  const intro = page.blocks.findIndex((block) => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <SansaBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="산사"
          src={sansaHref('ja', 'game.html?room=maru-38')}
          style={{ display: 'block', width: '100%', border: 0, background: '#24251f' }}
        />
        <div className="rf-seo-copy">
          <SansaBlocks blocks={rest} />
          <SansaNav locale="ja" current="home" />
        </div>
      </article>
    </main>
  )
}
