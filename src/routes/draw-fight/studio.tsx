import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

import { studioShell } from '../../../draw-fight/src/pages/shells'
import { openDrawFrame } from '../../draw-fight/frame'
import { rakugakiPathCanonical } from '../../draw-fight/seo'
import { SiteIndexLinks } from '../../site-links'

type StudioSearch = {
  demo?: 1
  screen?: 'stages'
  render?: '2d'
  debug?: 'gpu'
}

export const Route = createFileRoute('/draw-fight/studio')({
  ssr: true,
  validateSearch: (search: Record<string, unknown>): StudioSearch => ({
    demo: search.demo === '1' || search.demo === 1 ? 1 : undefined,
    screen: search.screen === 'stages' ? 'stages' : undefined,
    render: search.render === '2d' ? '2d' : undefined,
    debug: search.debug === 'gpu' ? 'gpu' : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'お絵描きスタジオ｜ラクガキファイター' },
      { name: 'robots', content: 'noindex,follow' },
      { name: 'theme-color', content: '#faf5e8' },
    ],
    links: [{ rel: 'canonical', href: rakugakiPathCanonical('draw-fight/studio') }],
  }),
  component: DrawFightStudio,
})

function DrawFightStudio() {
  const hostRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const { shadow, root } = openDrawFrame(host, 'rf-studio', studioShell)
    let cleanup = () => {}
    let cancel = false
    void import('../../../draw-fight/src/game/mount-studio.ts').then(mod => {
      if (cancel) return
      cleanup = mod.mountStudio(root)
    })
    return () => {
      cancel = true
      cleanup()
      shadow.innerHTML = ''
    }
  }, [])
  return (
    <>
      <div ref={hostRef} style={{ minHeight: '100dvh', background: '#d9e5e3' }} />
      <SiteIndexLinks current="draw-fight/studio" />
    </>
  )
}
