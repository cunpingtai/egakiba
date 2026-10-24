import { createFileRoute } from '@tanstack/react-router'
import { SeoLandingPage } from '../seo/LandingPage'
import { seoRouteHead, ROUTE_BASE } from '../seo/route-head'

export const Route = createFileRoute('/play')({
  ssr: true,
  head: () => seoRouteHead('play', 'ja'),
  component: playPage,
})

function playPage() {
  return <SeoLandingPage pageKey="play" locale="ja" routeBase={ROUTE_BASE} />
}
