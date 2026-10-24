import { createFileRoute } from '@tanstack/react-router'
import { SeoLandingPage } from '../seo/LandingPage'
import { seoRouteHead, ROUTE_BASE } from '../seo/route-head'

export const Route = createFileRoute('/compare')({
  ssr: true,
  head: () => seoRouteHead('compare', 'ja'),
  component: comparePage,
})

function comparePage() {
  return <SeoLandingPage pageKey="compare" locale="ja" routeBase={ROUTE_BASE} />
}
