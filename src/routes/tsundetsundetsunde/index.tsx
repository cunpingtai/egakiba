import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { TsundeBlocks, TsundeNav } from '../../tsundetsundetsunde/Article'
import { getTsundePage, tsundeHead, tsundeHref } from '../../tsundetsundetsunde/seo'

const page = getTsundePage('home')
if (!page) throw new Error('ツンデツンデツンデ home copy is missing')

export const Route = createFileRoute('/tsundetsundetsunde/')({
  ssr: true,
  head: () => tsundeHead(page),
  component: TsundeHome,
})

function TsundeHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <TsundeBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="ツンデツンデツンデ"
          src={tsundeHref('game.html')}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#111922' }}
        />
        <div className="rf-seo-copy">
          <TsundeBlocks blocks={rest} />
          <TsundeNav />
        </div>
      </article>
    </main>
  )
}
