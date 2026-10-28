import { createFileRoute } from '@tanstack/react-router'

import '../../draw-fight/src/notebook/seo.css'
import { SiteInfoPage } from '../site-info/Article'
import { siteInfoHead } from '../site-info/seo'

export const Route = createFileRoute('/about')({
  ssr: true,
  head: () => siteInfoHead('about'),
  component: AboutPage,
})

function AboutPage() {
  return <SiteInfoPage slug="about" />
}
