import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { PrefBlocks, PrefNav } from '../../prefecture-game/Article'
import { getPrefPage, prefHead, prefHref } from '../../prefecture-game/seo'

const page = getPrefPage('home')
if (!page) throw new Error('新・都道府県ゲーム home copy is missing')

export const Route = createFileRoute('/prefecture-game/')({
  ssr: true,
  head: () => prefHead(page),
  component: PrefHome,
})

function PrefHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <PrefBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="新・都道府県ゲーム"
          src={prefHref('game.html')}
          style={{ display: 'block', width: '100%', border: 0, background: '#e9e4da' }}
        />
        <div className="rf-seo-copy">
          <PrefBlocks blocks={rest} />
          <PrefNav current="home" />
        </div>
      </article>
    </main>
  )
}
