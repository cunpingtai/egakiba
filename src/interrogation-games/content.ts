export type InterrogationBlock =
  | { type: 'h1' | 'h2' | 'h3' | 'p'; text: string }

export type InterrogationPage = {
  slug: string
  title: string
  description: string
  blocks: InterrogationBlock[]
}

export const INTERROGATION_PAGE: InterrogationPage = {
  slug: 'home',
  title: '尋問ゲーム無料｜嘘を見抜くブラウザゲーム',
  description: '無料の尋問ゲーム「浮気した夫に全部吐かせる」をブラウザで遊べます。嘘の癖、スマホの証拠、Sランクとエンディングを比較。現実の浮気調査や慰謝料の相談ではありません。',
  blocks: [
    { type: 'h1', text: '無料で遊べる尋問ゲーム' },
    { type: 'p', text: 'このページの尋問ゲームは、いまは「浮気した夫に全部吐かせる」です。嘘の癖とスマホの記録から、隠された回数を聞くブラウザゲームです。浮気ゲーム、嘘を見抜くゲーム、として探している場合も、遊べるのはこの1本です。' },
    { type: 'p', text: '架空の物語です。現実の浮気調査、自白の強要、慰謝料の計算には使えません。' },
    { type: 'h2', text: '浮気した夫に全部吐かせる' },
    { type: 'p', text: '夜22時から朝7時まで、最大3日。浮気の回数は1〜6回で、遊ぶたびに変わります。「夫が浮気した」と「妻が浮気した」を選べます。評価はSからDで、全部吐かせても、責めの点数が高いとBになります。' },
    { type: 'p', text: '**主な操作：** 質問、スマホのアプリ、証拠を突きつける、判決' },
    { type: 'p', text: '**[尋問ゲームを無料で遊ぶ](/uwaki-jinmon/)**　[Sランク](/uwaki-jinmon/s-rank/)　[証拠](/uwaki-jinmon/evidence/)　[エンディング](/uwaki-jinmon/endings/)' },
    { type: 'h2', text: 'このページで扱わない検索' },
    { type: 'p', text: '「旦那 浮気 証拠」「夫 浮気 慰謝料」「浮気 調査 方法」は、現実の相談や調査の検索です。このサイトのゲームページは、その意図を受けません。遊びの点数と、ゲーム内の金額だけを説明しています。' },
  ],
}
