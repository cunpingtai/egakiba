import { createFileRoute } from '@tanstack/react-router'

import '../../../draw-fight/src/notebook/seo.css'
import { CookingBlocks, CookingNav } from '../../cooking-games/Article'
import { cookingHead, getCookingPage } from '../../cooking-games/seo'

const page = getCookingPage()

export const Route = createFileRoute('/cooking-games/')({
  ssr: true,
  head: () => cookingHead(page),
  component: CookingGamesPage,
})

function CookingGamesPage() {
  return (
    <main className="rf-seo">
      <article className="rf-seo-copy">
        <CookingBlocks blocks={page.blocks} />
        <CookingNav />
      </article>
    </main>
  )
}
