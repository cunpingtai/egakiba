import { createFileRoute, notFound } from '@tanstack/react-router'

import { Quiz } from '../../../koi-shindan/Quiz'
import { SITE_NAME, getQuiz } from '../../../koi-shindan/score.mjs'
import { koiCanonical, koiHead } from '../../../koi-shindan/seo'

type QuizSearch = { again?: 1 }

export const Route = createFileRoute('/koi-shindan/$quiz/')({
  ssr: true,
  validateSearch: (search: Record<string, unknown>): QuizSearch => (
    search.again === 1 || search.again === '1' ? { again: 1 } : {}
  ),
  loader: ({ params }) => {
    const quiz = getQuiz(params.quiz)
    if (!quiz) throw notFound()
    return quiz
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    return koiHead(
      loaderData.seoTitle,
      loaderData.seoDescription,
      `${loaderData.id}/`,
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: loaderData.ja,
        description: loaderData.lede,
        inLanguage: 'ja',
        url: koiCanonical(`${loaderData.id}/`),
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: koiCanonical() },
      },
    )
  },
  component: QuizRoute,
})

function QuizRoute() {
  const quiz = Route.useLoaderData()
  const { again } = Route.useSearch()
  return (
    <main>
      <Quiz quizId={quiz.id} again={again ?? 0} />
    </main>
  )
}
