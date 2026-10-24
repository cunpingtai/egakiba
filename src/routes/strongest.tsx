import { createFileRoute } from '@tanstack/react-router'
import { SeoLandingPage } from '../seo/LandingPage'
import { seoRouteHead, ROUTE_BASE } from '../seo/route-head'

export const Route = createFileRoute('/strongest')({
  ssr: true,
  head: () => seoRouteHead('strongest', 'ja'),
  component: strongestPage,
})

function strongestPage() {
  return <SeoLandingPage pageKey="strongest" locale="ja" routeBase={ROUTE_BASE} />
}
