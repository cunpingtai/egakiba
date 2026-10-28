import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { DarumaBlocks, DarumaNav } from '../../daruma/Article'
import { darumaHead, darumaHref, getDarumaPage } from '../../daruma/seo'

export const Route = createFileRoute('/daruma/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getDarumaPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? darumaHead(loaderData) : {},
  component: DarumaGuide,
})

function DarumaGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={darumaHref()}>だるまさんがころんだへ</a></p>
        <DarumaBlocks blocks={page.blocks} />
        <DarumaNav current={page.slug} />
      </article>
    </main>
  )
}
