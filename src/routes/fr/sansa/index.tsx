import { createFileRoute } from '@tanstack/react-router'

import '../../../../draw-fight/src/notebook/seo.css'
import { SansaBlocks, SansaNav } from '../../../sansa/Article'
import { getSansaPage, sansaHead, sansaHref } from '../../../sansa/seo'

const page = getSansaPage('fr', 'home')
if (!page) throw new Error('sansa fr home is missing')

export const Route = createFileRoute('/fr/sansa/')({
  ssr: true,
  head: () => sansaHead('fr', page),
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
          title="Sansa"
          src={sansaHref('fr', 'game.html?room=maru-38')}
          style={{ display: 'block', width: '100%', border: 0, background: '#24251f' }}
        />
        <div className="rf-seo-copy">
          <SansaBlocks blocks={rest} />
          <SansaNav locale="fr" current="home" />
        </div>
      </article>
    </main>
  )
}
