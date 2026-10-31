export const SITE_NAME: string

export type QuizMeta = {
  id: string
  title: string
  ja: string
  lede: string
  minutes: number
  countLabel: string
  seoTitle: string
  seoDescription: string
}

export type QuizQuestion = {
  kind: 'choice' | 'likert'
  prompt: string
  left?: string
  right?: string
  options?: { label: string }[]
}

export type QuizData = QuizMeta & {
  hint: string
  aside?: string
  seoLinks?: { code: string; label: string }[]
  questions: QuizQuestion[]
}

export type ResultBar = { id: string; label: string; value: number; color: string }
export type ResultTrait = { letter: string; note: string }
export type ResultPeer = { code: string; name: string }
export type ResultSubtype = { code: string; name: string; catch: string }

export type PresentedResult = {
  quizId: string
  code: string
  badge: string
  name: string
  subname: string
  catch: string
  blurb: string
  aruaru: string[]
  love: string
  strength: string
  pitfall: string
  mood: string
  kicker: string
  bars: ResultBar[]
  traits: ResultTrait[]
  subtypes: ResultSubtype[]
  peers: ResultPeer[]
  matches?: { friend: string; love: string; clashFriend: string; clashLove: string }
  description: string
}

export const QUIZ_LIST: QuizMeta[]
export function getQuiz(id: string): QuizData | null
export function cleanName(value: unknown): string
export function finishQuiz(quizId: string, answers: number[]): { code: string; s: string } | null
export function presentResult(quizId: string, code: string): PresentedResult | null
export function resultSeo(page: PresentedResult | null): { title: string; description: string }
export function personalize(page: PresentedResult | null, raw: string): { personal: boolean; page: PresentedResult }
export function catalog(quizId: string): ResultPeer[]
export function pairNote(quizId: string, codeA: string, codeB: string): { score: number; note: string; nameA: string; nameB: string } | null
export function shareText(page: { name: string; badge: string; catch: string }, name: string, url: string): { full: string; line: string }
