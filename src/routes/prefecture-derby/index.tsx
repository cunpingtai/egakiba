import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { DerbyBlocks, DerbyNav } from '../../prefecture-derby/Article'
import { derbyHead, derbyHref, getDerbyPage } from '../../prefecture-derby/seo'

const page = getDerbyPage('home')
if (!page) throw new Error('都道府県ダービー home copy is missing')

export const Route = createFileRoute('/prefecture-derby/')({
  ssr: true,
  head: () => derbyHead(page),
  component: DerbyHome,
})

function DerbyHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <DerbyBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="都道府県ダービー"
          src={derbyHref('game.html')}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#4aa3dc' }}
        />
        <div className="rf-seo-copy">
          <DerbyBlocks blocks={rest} />
          <DerbyNav current="home" />
        </div>
      </article>
    </main>
  )
}
