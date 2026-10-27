import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { UwakiBlocks, UwakiNav } from '../../uwaki-jinmon/Article'
import { getUwakiPage, uwakiHead, uwakiHref } from '../../uwaki-jinmon/seo'

export const Route = createFileRoute('/uwaki-jinmon/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getUwakiPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? uwakiHead(loaderData) : {},
  component: UwakiGuide,
})

function UwakiGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={uwakiHref()}>浮気した夫に全部吐かせるへ</a></p>
        <UwakiBlocks blocks={page.blocks} />
        <UwakiNav current={page.slug} />
      </article>
    </main>
  )
}
