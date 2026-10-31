import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { TenhouBlocks, TenhouNav } from '../../tenhou-simulator/Article'
import { getTenhouPage, tenhouHead, tenhouHref } from '../../tenhou-simulator/seo'

const page = getTenhouPage('home')
if (!page) throw new Error('天和シミュレーター home copy is missing')

export const Route = createFileRoute('/tenhou-simulator/')({
  ssr: true,
  head: () => tenhouHead(page),
  component: TenhouHome,
})

function TenhouHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <TenhouBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="天和シミュレーター"
          src={tenhouHref('game.html')}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#0f172a' }}
        />
        <div className="rf-seo-copy">
          <TenhouBlocks blocks={rest} />
          <TenhouNav current="home" />
        </div>
      </article>
    </main>
  )
}
