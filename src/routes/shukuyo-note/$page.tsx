import { createFileRoute, notFound } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { YadoArticle } from '../../shukuyo-note/Article'
import { getYadoPage, yadoHead } from '../../shukuyo-note/seo'

export const Route = createFileRoute('/shukuyo-note/$page')({
  ssr: true,
  loader: ({ params }) => {
    const page = getYadoPage(params.page)
    if (!page || page.slug === 'home') throw notFound()
    return page
  },
  head: ({ loaderData }) => loaderData ? yadoHead(loaderData) : {},
  component: YadoChild,
})

function YadoChild() {
  const page = Route.useLoaderData()
  return <YadoArticle page={page} />
}
