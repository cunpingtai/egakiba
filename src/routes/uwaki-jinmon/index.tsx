import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { UwakiBlocks, UwakiNav } from '../../uwaki-jinmon/Article'
import { getUwakiPage, uwakiHead, uwakiHref } from '../../uwaki-jinmon/seo'

const page = getUwakiPage('home')
if (!page) throw new Error('Uwaki home copy is missing')

export const Route = createFileRoute('/uwaki-jinmon/')({
  ssr: true,
  head: () => uwakiHead(page),
  component: UwakiHome,
})

function UwakiHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <UwakiBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="浮気した夫に全部吐かせる"
          src={uwakiHref('game.html')}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#0b0a09' }}
        />
        <div className="rf-seo-copy">
          <UwakiBlocks blocks={rest} />
          <UwakiNav current="home" />
        </div>
      </article>
    </main>
  )
}
