import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { CoasterBlocks, CoasterNav } from '../../rakugaki-coaster/Article'
import { coasterHead, coasterHref, getCoasterPage } from '../../rakugaki-coaster/seo'

const page = getCoasterPage('home')
if (!page) throw new Error('Coaster home copy is missing')

export const Route = createFileRoute('/rakugaki-coaster/')({
  ssr: true,
  head: () => coasterHead(page),
  component: CoasterHome,
})

function CoasterHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  const [src, setSrc] = useState(coasterHref('game.html'))
  useEffect(() => {
    const hash = window.location.hash
    if (/^#[ct]=[A-Za-z0-9_-]+$/.test(hash)) setSrc(coasterHref('game.html') + hash)
  }, [])
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <CoasterBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="らくがきコースター"
          src={src}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#9fd4f2' }}
        />
        <div className="rf-seo-copy">
          <CoasterBlocks blocks={rest} />
          <CoasterNav current="home" />
        </div>
      </article>
    </main>
  )
}
