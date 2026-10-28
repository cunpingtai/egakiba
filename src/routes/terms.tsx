import { createFileRoute } from '@tanstack/react-router'

import '../../draw-fight/src/notebook/seo.css'
import { SiteInfoPage } from '../site-info/Article'
import { siteInfoHead } from '../site-info/seo'

export const Route = createFileRoute('/terms')({
  ssr: true,
  head: () => siteInfoHead('terms'),
  component: TermsPage,
})

function TermsPage() {
  return <SiteInfoPage slug="terms" />
}
