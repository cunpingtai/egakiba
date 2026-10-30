import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { LatteBlocks, LatteNav } from '../../latteart-maker/Article'
import { getLattePage, latteHead, latteHref } from '../../latteart-maker/seo'

const page = getLattePage('home')
if (!page) throw new Error('Latte art home copy is missing')

export const Route = createFileRoute('/latteart-maker/')({
  ssr: true,
  head: () => latteHead(page),
  component: LatteHome,
})

function LatteHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <LatteBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="ラテアート注ぎました"
          src={latteHref('game.html')}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#3b271a' }}
        />
        <div className="rf-seo-copy">
          <LatteBlocks blocks={rest} />
          <LatteNav current="home" />
        </div>
      </article>
    </main>
  )
}
