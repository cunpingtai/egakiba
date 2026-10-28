import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { IceBlocks, IceNav } from '../../ice-break/Article'
import { getIcePage, iceHead, iceHref } from '../../ice-break/seo'

const page = getIcePage('home')
if (!page) throw new Error('ICE BREAK home copy is missing')

export const Route = createFileRoute('/ice-break/')({
  ssr: true,
  head: () => iceHead(page),
  component: IceHome,
})

function IceHome() {
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
          title="ICE BREAK"
          src={iceHref('game.html')}
          style={{ display: 'block', width: '100%', border: 0, background: '#071725' }}
        />
        <div className="rf-seo-copy">
          <IceBlocks blocks={rest} />
          <IceNav current="home" />
        </div>
      </article>
    </main>
  )
}
