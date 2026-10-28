import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { DarumaBlocks, DarumaNav } from '../../daruma/Article'
import { darumaHead, darumaHref, getDarumaPage } from '../../daruma/seo'

const page = getDarumaPage('home')
if (!page) throw new Error('だるまさんがころんだ home copy is missing')

export const Route = createFileRoute('/daruma/')({
  ssr: true,
  head: () => darumaHead(page),
  component: DarumaHome,
})

function DarumaHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <DarumaBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="だるまさんがころんだ"
          src={darumaHref('game.html')}
          style={{ display: 'block', width: '100%', border: 0, background: '#1a0f0c' }}
        />
        <div className="rf-seo-copy">
          <DarumaBlocks blocks={rest} />
          <DarumaNav current="home" />
        </div>
      </article>
    </main>
  )
}
