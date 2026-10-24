import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { TyphoonBlocks, TyphoonNav } from '../../typhoon-escape/Article'
import { getTyphoonPage, typhoonHead, typhoonHref } from '../../typhoon-escape/seo'

const page = getTyphoonPage('home')
if (!page) throw new Error('Typhoon Escape home copy is missing')

export const Route = createFileRoute('/typhoon-escape/')({
  ssr: true,
  head: () => typhoonHead(page),
  component: TyphoonHome,
})

function TyphoonHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <TyphoonBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="タイフーンエスケープ"
          src={typhoonHref('game.html')}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#1B2F5E' }}
        />
        <div className="rf-seo-copy">
          <TyphoonBlocks blocks={rest} />
          <TyphoonNav current="home" />
        </div>
      </article>
    </main>
  )
}
