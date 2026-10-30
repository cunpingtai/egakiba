export type DrawingBlock =
  | { type: 'h1' | 'h2' | 'h3' | 'p'; text: string }

export type DrawingPage = {
  slug: string
  title: string
  description: string
  blocks: DrawingBlock[]
}

export const DRAWING_PAGE: DrawingPage = {
  slug: 'home',
  title: '無料お絵描きゲーム｜ブラウザで遊べる描画ゲーム',
  description: 'ブラウザで遊べる無料のお絵描きゲーム。線を描いて乗る、オムライスにケチャップで描く、キャラを描いて戦う、写真にジッパーを描く、半紙に筆で書くゲームをこのサイトで遊べます。',
  blocks: [
    { type: 'h1', text: '無料で遊べるお絵描きゲーム' },
    { type: 'p', text: 'このページは、このサイトで線を描いて遊ぶゲームの一覧です。どれもブラウザで開き、会員登録なしで遊べます。' },
    { type: 'h2', text: 'らくがきコースター' },
    { type: 'p', text: '一筆で描いた線がジェットコースターのコースになり、一人称で乗れます。ゴールしたコースはリンクで渡せます。' },
    { type: 'p', text: '**[らくがきコースターを遊ぶ](/rakugaki-coaster/)**　[遊び方](/rakugaki-coaster/how-to-play/)　[コースの共有](/rakugaki-coaster/share/)' },
    { type: 'h2', text: 'オム文字シミュレーター' },
    { type: 'p', text: '立体のオムライスに、ケチャップで文字や絵を描きます。ゆっくりなぞると線が太くなります。完成したあとに向きを変えて、画像を保存できます。卵を焼くゲームとは別です。' },
    { type: 'p', text: '**[オムライスに絵を描く](/omurice/)**　[遊び方](/omurice/how-to-play/)　[描くアイデア](/omurice/ketchup-art/)' },
    { type: 'h2', text: 'ラクガキファイター' },
    { type: 'p', text: '描いたキャラクターが動いて戦うゲームです。線の形が、そのまま戦うキャラになります。' },
    { type: 'p', text: '**[ラクガキファイターを遊ぶ](/draw-fight/)**　[遊び方](/draw-fight/how-to-play/)' },
    { type: 'h2', text: 'ジッパーフィンガー' },
    { type: 'p', text: '写真の上にジッパーを描いて、中の写真を開きます。' },
    { type: 'p', text: '**[ジッパーフィンガーを遊ぶ](/zipper-finger/)**　[遊び方](/zipper-finger/how-to-play/)' },
    { type: 'h2', text: '書道シミュレーター3D' },
    { type: 'p', text: '半紙に筆で字を書き、点数を見ます。お絵描きというより習字です。' },
    { type: 'p', text: '**[書道シミュレーター3Dを遊ぶ](/shodo-simulator-3d/)**　[遊び方](/shodo-simulator-3d/how-to-play/)' },
    { type: 'h2', text: '料理そのものを作るゲーム' },
    { type: 'p', text: '卵焼き、オムライスを作る操作、ハンバーグ、ぐるぐるポテトは[無料料理ゲーム](/cooking-games/)にまとめています。' },
    { type: 'p', text: '[ホームへ戻る](/)' },
  ],
}
