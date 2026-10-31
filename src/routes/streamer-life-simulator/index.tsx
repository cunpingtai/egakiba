import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { StreamerBlocks, StreamerNav } from '../../streamer-life-simulator/Article'
import { getStreamerPage, streamerHead, streamerHref } from '../../streamer-life-simulator/seo'

const page = getStreamerPage('home')
if (!page) throw new Error('配信者人生シミュレーター home copy is missing')

export const Route = createFileRoute('/streamer-life-simulator/')({
  ssr: true,
  head: () => streamerHead(page),
  component: StreamerHome,
})

function StreamerHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <StreamerBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="配信者人生シミュレーター"
          src={streamerHref('game.html')}
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#100d19' }}
        />
        <div className="rf-seo-copy">
          <StreamerBlocks blocks={rest} />
          <StreamerNav current="home" />
        </div>
      </article>
    </main>
  )
}
