import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { ShusshinBlocks, ShusshinNav } from '../../shusshin-ken/Article'
import { getShusshinPage, shusshinHead, shusshinHref } from '../../shusshin-ken/seo'

export const Route = createFileRoute('/shusshin-ken/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getShusshinPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? shusshinHead(loaderData) : {},
  component: ShusshinGuide,
})

function ShusshinGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={shusshinHref()}>出身地、当てますのガイドへ</a></p>
        <ShusshinBlocks blocks={page.blocks} />
        <ShusshinNav current={page.slug} />
      </article>
    </main>
  )
}
