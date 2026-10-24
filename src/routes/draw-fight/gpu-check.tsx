import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

import { gpuShell } from '../../../draw-fight/src/pages/shells'
import { openDrawFrame } from '../../draw-fight/frame'
import { rakugakiPathCanonical } from '../../draw-fight/seo'

export const Route = createFileRoute('/draw-fight/gpu-check')({
  ssr: true,
  head: () => ({
    meta: [
      { title: 'GPUチェック｜ラクガキファイター' },
      { name: 'robots', content: 'noindex,follow' },
      { name: 'theme-color', content: '#faf5e8' },
    ],
    links: [{ rel: 'canonical', href: rakugakiPathCanonical('draw-fight/gpu-check') }],
  }),
  component: DrawFightGpu,
})

function DrawFightGpu() {
  const hostRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const { shadow, root } = openDrawFrame(host, 'rf-gpu', gpuShell)
    let cleanup = () => {}
    let cancel = false
    void import('../../../draw-fight/src/game/mount-gpu.ts').then(mod => {
      if (cancel) return
      cleanup = mod.mountGpu(root)
    })
    return () => {
      cancel = true
      cleanup()
      shadow.innerHTML = ''
    }
  }, [])
  return <div ref={hostRef} style={{ minHeight: '100dvh', background: '#faf5e8' }} />
}
