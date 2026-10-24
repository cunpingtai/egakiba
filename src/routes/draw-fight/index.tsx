import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

import { homeShell } from '../../../draw-fight/src/pages/shells'
import '../../../draw-fight/src/notebook/seo.css'
import { openDrawFrame } from '../../draw-fight/frame'
import { GuideNav, SeoBlocks } from '../../draw-fight/SeoArticle'
import { getRakugakiPage, rakugakiHead } from '../../draw-fight/seo'

const page = getRakugakiPage('home')
if (!page) throw new Error('Rakugaki home copy is missing')

export const Route = createFileRoute('/draw-fight/')({
  ssr: true,
  validateSearch: (search: Record<string, unknown>) => ({
    preview: search.preview === 'returning' ? 'returning' as const : undefined,
  }),
  head: () => rakugakiHead(page),
  component: DrawFightHome,
})

function DrawFightHome() {
  const hostRef = useRef<HTMLDivElement>(null)
  const intro = page.blocks.findIndex(block => block.type === 'h2')
  const lead = page.blocks.slice(0, intro)
  const rest = page.blocks.slice(intro)
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const { shadow, root } = openDrawFrame(host, 'rf-home', homeShell)
    let cleanup = () => {}
    let cancel = false
    void import('../../../draw-fight/src/game/mount-home.ts').then(mod => {
      if (cancel) return
      cleanup = mod.mountHome(enabled => root.classList.toggle('sound-on', enabled), root)
    })
    return () => {
      cancel = true
      cleanup()
      shadow.innerHTML = ''
    }
  }, [])
  return (
    <main className="rf-seo">
      <article>
        <div className="rf-seo-banner">
          <SeoBlocks blocks={lead} />
        </div>
        <div id="play" ref={hostRef} className="rf-seo-play" style={{ minHeight: '100dvh', background: '#dbe5e1' }} />
        <div className="rf-seo-copy">
          <SeoBlocks blocks={rest} />
          <GuideNav current="home" />
        </div>
      </article>
    </main>
  )
}
