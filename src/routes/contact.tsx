import { createFileRoute } from '@tanstack/react-router'

import '../../draw-fight/src/notebook/seo.css'
import { SiteInfoPage } from '../site-info/Article'
import { siteInfoHead } from '../site-info/seo'

export const Route = createFileRoute('/contact')({
  ssr: true,
  head: () => siteInfoHead('contact'),
  component: ContactPage,
})

function ContactPage() {
  return <SiteInfoPage slug="contact" />
}
