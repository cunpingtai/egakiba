import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { KazokuBlocks, KazokuNav } from '../../kazoku-igai/Article'
import { getKazokuPage, kazokuHead, kazokuHref } from '../../kazoku-igai/seo'

const page = getKazokuPage('home')
if (!page) throw new Error('家族以外は入れないでください home copy is missing')

export const Route = createFileRoute('/kazoku-igai/')({
  ssr: true,
  head: () => kazokuHead(page),
  component: KazokuHome,
})

function KazokuHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <KazokuBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="家族以外は入れないでください"
          src={kazokuHref('game.html')}
          style={{ display: 'block', width: '100%', border: 0, background: '#000' }}
        />
        <div className="rf-seo-copy">
          <KazokuBlocks blocks={rest} />
          <KazokuNav current="home" />
        </div>
      </article>
    </main>
  )
}
