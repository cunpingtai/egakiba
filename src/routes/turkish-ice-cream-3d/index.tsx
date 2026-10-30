import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { IceBlocks, IceNav } from '../../turkish-ice-cream-3d/Article'
import { getIcePage, turkishIceHead, turkishIceHref } from '../../turkish-ice-cream-3d/seo'

const page = getIcePage('home')
if (!page) throw new Error('Turkish ice home copy is missing')

export const Route = createFileRoute('/turkish-ice-cream-3d/')({
  ssr: true,
  head: () => turkishIceHead(page),
  component: TurkishIceHome,
})

function TurkishIceHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <IceBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="トルコアイス3D"
          src={turkishIceHref('game.html')}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#e9e9e9' }}
        />
        <div className="rf-seo-copy">
          <IceBlocks blocks={rest} />
          <IceNav current="home" />
        </div>
      </article>
    </main>
  )
}
