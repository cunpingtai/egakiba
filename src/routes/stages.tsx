import { createFileRoute } from '@tanstack/react-router'
import { SeoLandingPage } from '../seo/LandingPage'
import { seoRouteHead, ROUTE_BASE } from '../seo/route-head'

export const Route = createFileRoute('/stages')({
  ssr: true,
  head: () => seoRouteHead('stages', 'ja'),
  component: stagesPage,
})

function stagesPage() {
  return <SeoLandingPage pageKey="stages" locale="ja" routeBase={ROUTE_BASE} />
}
