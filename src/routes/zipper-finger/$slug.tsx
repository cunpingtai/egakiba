import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { ZipperBlocks, ZipperNav } from '../../zipper-finger/Article'
import { getZipperPage, zipperHead, zipperHref } from '../../zipper-finger/seo'

export const Route = createFileRoute('/zipper-finger/$slug')({
  ssr: true,
  loader: ({ params }) => {
    const page = getZipperPage(params.slug)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? zipperHead(loaderData) : {},
  component: ZipperGuide,
})

function ZipperGuide() {
  const page = Route.useLoaderData()
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <p><a className="rf-seo-back" href={zipperHref('#play')}>ジッパーフィンガーを開く</a></p>
        <ZipperBlocks blocks={page.blocks} />
        <ZipperNav current={page.slug} />
      </article>
    </main>
  )
}
