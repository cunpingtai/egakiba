import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { ZipperBlocks, ZipperNav } from '../../zipper-finger/Article'
import { getZipperPage, zipperHead, zipperHref } from '../../zipper-finger/seo'

const page = getZipperPage('home')
if (!page) throw new Error('Zipper Finger home copy is missing')

export const Route = createFileRoute('/zipper-finger/')({
  ssr: true,
  head: () => zipperHead(page),
  component: ZipperHome,
})

function ZipperHome() {
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <ZipperBlocks blocks={lead} />
        </div>
        <iframe
          id="play"
          title="ジッパーフィンガー"
          src={zipperHref('game.html')}
          allow="camera"
          style={{ display: 'block', width: '100%', height: '100dvh', border: 0, background: '#222' }}
        />
        <div className="rf-seo-copy">
          <ZipperBlocks blocks={rest} />
          <ZipperNav current="home" />
        </div>
      </article>
    </main>
  )
}
