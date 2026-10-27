import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { RegionBlocks, RegionNav } from '../../regional-differences/Article'
import { getRegionPage, regionHead } from '../../regional-differences/seo'

const page = getRegionPage('home')
if (!page) throw new Error('regional differences home is missing')

export const Route = createFileRoute('/regional-differences/')({
  ssr: true,
  head: () => regionHead(page),
  component: RegionalDifferencesPage,
})

function RegionalDifferencesPage() {
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <RegionBlocks blocks={page.blocks} />
        <RegionNav current="home" />
      </article>
    </main>
  )
}
