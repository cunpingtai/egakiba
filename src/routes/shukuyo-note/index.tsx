import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { YadoArticle } from '../../shukuyo-note/Article'
import { getYadoPage, yadoHead } from '../../shukuyo-note/seo'

function homePage() {
  const found = getYadoPage('home')
  if (!found) throw new Error('宿曜占いの案内がありません')
  return found
}

const page = homePage()

export const Route = createFileRoute('/shukuyo-note/')({
  ssr: true,
  head: () => yadoHead(page),
  component: YadoHome,
})

function YadoHome() {
  return <YadoArticle page={page} />
}
