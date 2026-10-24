import { createFileRoute } from '@tanstack/react-router'
import { SeoLandingPage } from '../seo/LandingPage'
import { seoRouteHead, ROUTE_BASE } from '../seo/route-head'

export const Route = createFileRoute('/how-to-play')({
  ssr: true,
  head: () => seoRouteHead('how-to-play', 'ja'),
  component: how_to_playPage,
})

function how_to_playPage() {
  return <SeoLandingPage pageKey="how-to-play" locale="ja" routeBase={ROUTE_BASE} />
}
