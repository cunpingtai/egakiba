import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { HankoBlocks, HankoNav } from '../../hanko-hankouki/Article'
import { getHankoPage, hankoHead, hankoHref } from '../../hanko-hankouki/seo'

const page = getHankoPage('home')
if (!page) throw new Error('ハンコう期 home copy is missing')

export const Route = createFileRoute('/hanko-hankouki/')({
  ssr: true,
  head: () => hankoHead(page),
  component: HankoHome,
})

function HankoHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <HankoBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="ハンコう期"
          src={hankoHref('game.html')}
          style={{ display: 'block', width: '100%', border: 0, background: '#d9dde2' }}
        />
        <div className="rf-seo-copy">
          <HankoBlocks blocks={rest} />
          <HankoNav />
        </div>
      </article>
    </main>
  )
}
