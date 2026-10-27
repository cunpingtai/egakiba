import { useEffect, useRef, type ReactNode } from 'react'

const SMARTLINK = 'https://araplhn.org/4/6592007dd77d791e89fd655c5b78d309'
const NATIVE_SRC = 'https://bauval.org/21/651f1cb8c89691de6b198c582cd46d10'
const NATIVE_ID = 'container-651f1cb8c89691de6b198c582cd46d10'

const RECTANGLE = { key: '03c3182da105d943cceb4def73d1823b', width: 300, height: 250 }
const MOBILE_BAR = { key: 'c6d6de537cea5b7869c80c3edc485832', width: 320, height: 50 }
const LEADERBOARD = { key: '6b09f68312d181415988138dd391e666', width: 728, height: 90 }

let started = false

function sinkTo(host: HTMLElement) {
  document.querySelectorAll('[data-ad-sink]').forEach((node) => node.removeAttribute('data-ad-sink'))
  host.setAttribute('data-ad-sink', 'true')
}

function keepWritesInsideTheSlot() {
  const write = (...chunks: string[]) => {
    const html = chunks.join('')
    const sink = document.querySelector('[data-ad-sink]')
    if (!sink || !html) return
    sink.insertAdjacentHTML('beforeend', html)
  }
  document.write = write
  document.writeln = write
}

function loadScript(host: ParentNode, src: string, attrs: Record<string, string> = {}) {
  return new Promise<void>((resolve) => {
    const script = document.createElement('script')
    script.src = src
    script.async = false
    for (const [key, value] of Object.entries(attrs)) script.setAttribute(key, value)
    script.onload = () => resolve()
    script.onerror = () => resolve()
    host.appendChild(script)
  })
}

async function mountBanner(host: HTMLElement, banner: { key: string; width: number; height: number }) {
  sinkTo(host)
  host.style.minHeight = `${banner.height}px`
  host.style.maxWidth = `${banner.width}px`
  const inline = document.createElement('script')
  inline.text = `atOptions = ${JSON.stringify({ key: banner.key, format: 'iframe', height: banner.height, width: banner.width, params: {} })};`
  host.appendChild(inline)
  await loadScript(host, `https://bauval.org/22/${banner.key}`)
}

export function SiteFrame({ children }: { children: ReactNode }) {
  const leader = useRef<HTMLDivElement>(null)
  const native = useRef<HTMLDivElement>(null)
  const rectangle = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (started) return
    started = true
    keepWritesInsideTheSlot()
    const leaderHost = leader.current
    const nativeHost = native.current
    const rectangleHost = rectangle.current
    const leaderboardFits = window.matchMedia('(min-width: 1408px)').matches
    void (async () => {
      if (leaderHost) await mountBanner(leaderHost, leaderboardFits ? LEADERBOARD : MOBILE_BAR)
      if (nativeHost) {
        sinkTo(nativeHost)
        const box = document.createElement('div')
        box.id = NATIVE_ID
        nativeHost.appendChild(box)
        await loadScript(nativeHost, NATIVE_SRC, { async: 'async', 'data-cfasync': 'false' })
      }
      if (rectangleHost) await mountBanner(rectangleHost, RECTANGLE)
    })()
  }, [])

  return (
    <>
      <div className="site-ads-top" ref={leader} aria-label="広告" />
      {children}
      <aside className="site-ad-rail site-ad-rail-left" ref={rectangle} aria-label="広告" />
      <aside className="site-ad-rail site-ad-rail-right" ref={native} aria-label="広告" />
      <p className="site-ad-link">
        <a href={SMARTLINK} rel="sponsored nofollow noopener" target="_blank">スポンサーリンク</a>
      </p>
    </>
  )
}
