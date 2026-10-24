import { createFileRoute } from '@tanstack/react-router'
import { SeoLandingPage } from '../seo/LandingPage'
import { seoRouteHead, ROUTE_BASE } from '../seo/route-head'

export const Route = createFileRoute('/glyphs')({
  ssr: true,
  head: () => seoRouteHead('glyphs', 'ja'),
  component: glyphsPage,
})

function glyphsPage() {
  return <SeoLandingPage pageKey="glyphs" locale="ja" routeBase={ROUTE_BASE} />
}
