import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { OmmojiBlocks, OmmojiNav } from '../../ommoji/Article'
import { getOmmojiPage, ommojiHead, ommojiHref } from '../../ommoji/seo'

const page = getOmmojiPage('home')
if (!page) throw new Error('Ommoji home copy is missing')

export const Route = createFileRoute('/omurice/')({
  ssr: true,
  head: () => ommojiHead(page),
  component: OmmojiHome,
})

function OmmojiHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <OmmojiBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="オム文字シミュレーター"
          src={ommojiHref('game.html')}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#000' }}
        />
        <div className="rf-seo-copy">
          <OmmojiBlocks blocks={rest} />
          <OmmojiNav current="home" />
        </div>
      </article>
    </main>
  )
}
