import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { ShusshinBlocks, ShusshinNav } from '../../shusshin-ken/Article'
import { getShusshinPage, shusshinHead, shusshinHref } from '../../shusshin-ken/seo'

const page = getShusshinPage('home')
if (!page) throw new Error('Shusshin home copy is missing')

export const Route = createFileRoute('/shusshin-ken/')({
  ssr: true,
  head: () => shusshinHead(page),
  component: ShusshinHome,
})

function ShusshinHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <ShusshinBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="出身地、当てます"
          src={shusshinHref('game.html')}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#0b1626' }}
        />
        <div className="rf-seo-copy">
          <ShusshinBlocks blocks={rest} />
          <ShusshinNav current="home" />
        </div>
      </article>
    </main>
  )
}
