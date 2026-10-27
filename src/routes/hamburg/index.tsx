import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { HamburgBlocks, HamburgNav } from '../../hamburg/Article'
import { getHamburgPage, hamburgHead, hamburgHref } from '../../hamburg/seo'

const page = getHamburgPage('home')
if (!page) throw new Error('Hamburg home copy is missing')

export const Route = createFileRoute('/hamburg/')({
  ssr: true,
  head: () => hamburgHead(page),
  component: HamburgHome,
})

function HamburgHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <HamburgBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="ハンバーグ作り"
          src={hamburgHref('game.html')}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#fff6e3' }}
        />
        <div className="rf-seo-copy">
          <HamburgBlocks blocks={rest} />
          <HamburgNav current="home" />
        </div>
      </article>
    </main>
  )
}
