import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { NnkoBlocks, NnkoNav } from '../../nnko-quiz/Article'
import { getNnkoPage, nnkoHead, nnkoHref } from '../../nnko-quiz/seo'

const page = getNnkoPage('home')
if (!page) throw new Error('Nnko quiz home copy is missing')

export const Route = createFileRoute('/nnko-quiz/')({
  ssr: true,
  head: () => nnkoHead(page),
  component: NnkoHome,
})

function NnkoHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <NnkoBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="〇んこクイズ"
          src={nnkoHref('game.html')}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#0a0a0c' }}
        />
        <div className="rf-seo-copy">
          <NnkoBlocks blocks={rest} />
          <NnkoNav current="home" />
        </div>
      </article>
    </main>
  )
}
