import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { SanmaBlocks, SanmaNav } from '../../sanma-bonenuki/Article'
import { getSanmaPage, sanmaHead, sanmaHref } from '../../sanma-bonenuki/seo'

const page = getSanmaPage('home')
if (!page) throw new Error('秋刀魚(骨抜き) home copy is missing')

export const Route = createFileRoute('/sanma-bonenuki/')({
  ssr: true,
  head: () => sanmaHead(page),
  component: SanmaHome,
})

function SanmaHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <SanmaBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="秋刀魚(骨抜き)"
          src={sanmaHref('game.html')}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#0d0b0a' }}
        />
        <div className="rf-seo-copy">
          <SanmaBlocks blocks={rest} />
          <SanmaNav />
        </div>
      </article>
    </main>
  )
}
