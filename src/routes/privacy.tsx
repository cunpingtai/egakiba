import { createFileRoute } from '@tanstack/react-router'

import '../../draw-fight/src/notebook/seo.css'
import { SiteInfoPage } from '../site-info/Article'
import { siteInfoHead } from '../site-info/seo'

export const Route = createFileRoute('/privacy')({
  ssr: true,
  head: () => siteInfoHead('privacy'),
  component: PrivacyPage,
})

function PrivacyPage() {
  return <SiteInfoPage slug="privacy" />
}
