import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { TenhouBlocks, TenhouNav } from '../../tenhou-simulator/Article'
import { getTenhouPage, tenhouHead } from '../../tenhou-simulator/seo'

export const Route = createFileRoute('/tenhou-simulator/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getTenhouPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? tenhouHead(loaderData) : {},
  component: TenhouGuide,
})

function TenhouGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <TenhouBlocks blocks={page.blocks} />
        <TenhouNav current={page.slug} />
      </article>
    </main>
  )
}
