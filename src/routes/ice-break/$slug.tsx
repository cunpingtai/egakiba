import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { IceBlocks, IceNav } from '../../ice-break/Article'
import { getIcePage, iceHead, iceHref } from '../../ice-break/seo'

export const Route = createFileRoute('/ice-break/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getIcePage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? iceHead(loaderData) : {},
  component: IceGuide,
})

function IceGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={iceHref()}>ICE BREAKへ</a></p>
        <IceBlocks blocks={page.blocks} />
        <IceNav current={page.slug} />
      </article>
    </main>
  )
}
