import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { BeerBlocks, BeerNav } from '../../beer-pour/Article'
import { beerHead, beerHref, getBeerPage } from '../../beer-pour/seo'

const page = getBeerPage('home')
if (!page) throw new Error('ビールをいい感じにつぐ home copy is missing')

export const Route = createFileRoute('/beer-pour/')({
  ssr: true,
  head: () => beerHead(page),
  component: BeerHome,
})

function BeerHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <BeerBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="ビールをいい感じにつぐ"
          src={beerHref('game.html')}
          style={{ display: 'block', width: '100%', border: 0, background: '#fff6dc' }}
        />
        <div className="rf-seo-copy">
          <BeerBlocks blocks={rest} />
          <BeerNav current="home" />
        </div>
      </article>
    </main>
  )
}
