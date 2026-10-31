export const YADO_ORIGIN = 'https://shukuyonote.com'

export type YadoBlock = { type: 'h2' | 'h3' | 'p'; text: string }

export type YadoAction = { href: string; label: string }

export type YadoPage = {
  slug: string
  title: string
  description: string
  h1: string
  lead: string
  actions: YadoAction[]
  blocks: YadoBlock[]
}

export const YADO_NAV = [
  ['home', '宿曜占い'],
  ['honmei', '本命宿'],
  ['aisho', '相性'],
  ['27shuku', '27宿'],
  ['28shuku', '28宿'],
  ['chigai', '27と28の違い'],
  ['keisan', '調べ方'],
] as const

const tool = (path = '') => `${YADO_ORIGIN}${path}`

export const YADO_PAGES: Record<string, YadoPage> = {
  home: {
    slug: 'home',
    title: '宿曜占い｜本命宿と相性は月の宿帖へ',
    description: '宿曜占星術の見方を短く説明します。本命宿、二人の相性、27宿と28宿の診断は、別サイトの月の宿帖（shukuyonote.com）で行います。',
    h1: '宿曜占い',
    lead: '月のめぐりに、あなたの宿を。生年月日からの診断は、月の宿帖で無料で行います。このページは、その前に読む案内です。',
    actions: [
      { href: tool('/shukuyo/'), label: '月の宿帖で本命宿を診断' },
      { href: '/shukuyo-note/honmei/', label: '本命宿とは' },
    ],
    blocks: [
      { type: 'h2', text: '宿曜占星術とは？' },
      { type: 'p', text: '**宿曜占い**は、月の通り道を27の宿に分け、生まれた日がどの宿に当たるかを見る占いです。その宿を**本命宿**と呼びます。元にあるのは宿曜経で、日本では宿曜占星術として性格や人との間柄を読むのに使われてきました。' },
      { type: 'p', text: 'このサイトでは計算しません。日付を入れて結果を出す場所は、[月の宿帖](https://shukuyonote.com/)です。' },
      { type: 'h2', text: '本命宿とは？生年月日で無料診断' },
      { type: 'p', text: '本命宿は、生まれた日を旧暦に直してから決まります。同じ新暦の日付でも、閏月の扱いが違うと宿がずれることがあります。[本命宿診断](/shukuyo-note/honmei/)に考え方を書き、実際の算出は[月の宿帖の本命宿](https://shukuyonote.com/shukuyo/)で行います。' },
      { type: 'h2', text: '宿曜の相性占い' },
      { type: 'p', text: '二人の本命宿の組み合わせは、命・栄親・友衰・安壊・危成・業胎の六つで読まれます。自分から相手を見た関係と、相手から自分を見た関係は、同じになるとは限りません。早見表と安壊の説明は[相性のページ](/shukuyo-note/aisho/)から、月の宿帖の[相性占い](https://shukuyonote.com/aisho/)へ進めます。' },
      { type: 'h2', text: '27宿と28宿' },
      { type: 'p', text: '宿曜の本命宿は27宿です。いっぽう28宿は牛宿を含む数え方で、同じ誕生日でも名前が違うことがあります。性格の一覧は[27宿](/shukuyo-note/27shuku/)、二十八宿は[28宿占い](/shukuyo-note/28shuku/)、食い違いの理由は[27宿と28宿の違い](/shukuyo-note/chigai/)に分けてあります。' },
      { type: 'h2', text: '調べ方は旧暦が要る' },
      { type: 'p', text: '新暦の誕生日を、そのまま宿の番号に当てるだけでは足りません。旧暦への換算と、閏月をどう数えるかが結果を分けます。手順の要点は[本命宿の調べ方](/shukuyo-note/keisan/)に書き、計算そのものは[月の宿帖の計算ページ](https://shukuyonote.com/shukuyo/calculation/)で確認できます。' },
      { type: 'h2', text: '宿曜以外の占い' },
      { type: 'p', text: '四柱推命とホロスコープは、宿曜とは別のやり方です。月の宿帖では[四柱推命](https://shukuyonote.com/shichusuimei/)と[ホロスコープ](https://shukuyonote.com/horoscope/)を、宿曜とは別のページに分けています。二人の相性まで出せるとは書いていません。宿曜の本命宿と、これらの結果を一つの順位にもしません。' },
      { type: 'h2', text: 'よくある質問' },
      { type: 'h3', text: 'このページで診断できますか？' },
      { type: 'p', text: 'できません。案内だけです。生年月日を入れる診断は[月の宿帖](https://shukuyonote.com/)で行います。' },
      { type: 'h3', text: '無料ですか？' },
      { type: 'p', text: '月の宿帖の宿曜占いは、無料で本命宿と相性を見る想定です。アプリのインストールはありません。' },
      { type: 'h3', text: '27宿と28宿はどちらが正しいですか？' },
      { type: 'p', text: '正しい方が一つ、というより数え方が違います。宿曜の本命宿は27宿です。28宿は牛宿を含む別の一覧です。' },
      { type: 'h3', text: '相性は一人分の宿だけで決まりますか？' },
      { type: 'p', text: '二人の本命宿が要ります。向きによって関係の名前が変わるので、片方だけの結果では読めません。' },
      { type: 'h2', text: '本命宿と相性を、月の宿帖で見る' },
      { type: 'p', text: '読み方を押さえたら、日付を入れるのは月の宿帖です。[本命宿を診断する](https://shukuyonote.com/shukuyo/)。二人なら[相性占い](https://shukuyonote.com/aisho/)です。' },
    ],
  },
  honmei: {
    slug: 'honmei',
    title: '本命宿診断｜生年月日からの調べ方',
    description: '本命宿は、生まれた日を旧暦に換算して27宿のどれに当たるかを見ます。診断そのものは月の宿帖で行います。',
    h1: '本命宿診断',
    lead: '生年月日から自分の宿を出すページです。計算は月の宿帖で行い、ここでは何を見ているのかを先に書きます。',
    actions: [
      { href: tool('/shukuyo/'), label: '月の宿帖で本命宿を診断' },
      { href: '/shukuyo-note/', label: '宿曜占いの案内' },
    ],
    blocks: [
      { type: 'h2', text: '本命宿は、生まれた日の宿' },
      { type: 'p', text: '本命宿は、その人の生まれた日が、月の27宿のどこに落ちるかを示す名前です。性格の読み物は宿ごとにあり、月の宿帖の結果ページで読めます。ここには27宿すべての文面は置いていません。' },
      { type: 'h2', text: '生年月日占いとの違い' },
      { type: 'p', text: '生年月日を使う占いはほかにもあります。本命宿の場合、見るのは星座の区切りではなく、旧暦に直したあとの月日と宿の対応です。新暦の月日だけで「この日はこの宿」と覚える表は、年によってずれます。' },
      { type: 'h2', text: '結果がサイトで違うとき' },
      { type: 'p', text: '旧暦の換算、閏月、27宿か28宿かの違いで、同じ誕生日でも宿の名前が変わることがあります。食い違いの整理は[27宿と28宿の違い](/shukuyo-note/chigai/)、手順は[調べ方](/shukuyo-note/keisan/)に書きました。月の宿帖での確認は[本命宿の計算](https://shukuyonote.com/shukuyo/calculation/)です。' },
      { type: 'h2', text: '診断したあとに相性を見る' },
      { type: 'p', text: '自分の宿が分かったら、次は相手の宿との組み合わせです。[宿曜の相性](/shukuyo-note/aisho/)から、[月の宿帖の相性占い](https://shukuyonote.com/aisho/)へ進めます。' },
    ],
  },
  aisho: {
    slug: 'aisho',
    title: '宿曜の相性占い｜栄親・安壊・業胎',
    description: '二人の本命宿から、宿曜の相性を六つの関係で見ます。向きによって名前が変わります。診断と早見表は月の宿帖です。',
    h1: '宿曜の相性占い',
    lead: '二人の生年月日から、宿と宿の間柄を見ます。入力と早見表は月の宿帖にあります。',
    actions: [
      { href: tool('/aisho/'), label: '月の宿帖で相性を見る' },
      { href: tool('/aisho/hayami/'), label: '相性早見表' },
    ],
    blocks: [
      { type: 'h2', text: '六つの関係' },
      { type: 'p', text: '宿曜の相性は、命・栄親・友衰・安壊・危成・業胎の六つです。命は同じ宿。栄親は近づくと栄えやすいとされる間柄。友衰は友人としてはよく、近づきすぎると衰えやすいとされる間柄。安壊は離れていると穏やかで、近いと壊れやすいとされる間柄。危成は波があり、危ないところから成るとされる間柄。業胎は縁が深く、業が絡むとされる間柄です。' },
      { type: 'p', text: 'これは関係の名前の説明です。二人の宿を入れた結果は、[月の宿帖の相性占い](https://shukuyonote.com/aisho/)で出します。27宿どうしの一覧は[相性早見表](https://shukuyonote.com/aisho/hayami/)です。' },
      { type: 'h2', text: '自分から見る関係と、相手から見る関係' },
      { type: 'p', text: 'AからBを見た名前と、BからAを見た名前は、同じとは限りません。片方だけを「この二人の相性」と決めないで、両方向を見ます。' },
      { type: 'h2', text: '安壊は、距離の話と一緒に読まれる' },
      { type: 'p', text: '安壊は、近いとぶつかり、離れるとおさまりやすい、と説明されることが多い関係です。遠距離であれば安心、という短絡でもありません。安壊の読み方は[月の宿帖の安壊](https://shukuyonote.com/aisho/ankai/)にまとまっています。' },
      { type: 'h2', text: '先に本命宿が要る' },
      { type: 'p', text: '相性は二人の本命宿が分かってからです。まだ自分の宿を見ていないときは、[本命宿診断](/shukuyo-note/honmei/)を先に読んで、[月の宿帖](https://shukuyonote.com/shukuyo/)で出してください。' },
    ],
  },
  '27shuku': {
    slug: '27shuku',
    title: '27宿の性格占い｜二十七宿の名前',
    description: '宿曜で使う27宿の名前を、昴からはじまる順に並べます。各宿の性格と相性の本文は月の宿帖で読めます。',
    h1: '27宿の性格占い',
    lead: '宿曜の本命宿は、この27です。宿ごとの読み物は月の宿帖にあり、このページは名前と回り方の案内です。',
    actions: [
      { href: tool('/shukuyo/27/'), label: '月の宿帖で27宿を見る' },
      { href: '/shukuyo-note/honmei/', label: '本命宿診断' },
    ],
    blocks: [
      { type: 'h2', text: '27の名前' },
      { type: 'p', text: '昴、畢、觜、参、井、鬼、柳、星、張、翼、軫、角、亢、氐、房、心、尾、箕、斗、女、虚、危、室、壁、奎、婁、胃。宿曜では、この順で月が宿を巡るとされます。牛はここには入りません。' },
      { type: 'h2', text: '性格は、宿のページで読む' },
      { type: 'p', text: '各宿には、ものの考え方、人との距離の取り方、恋愛や仕事での出方を書くページが月の宿帖にあります。27宿分をこのサイトにコピーはしていません。一覧と各宿への入口は[月の宿帖の27宿](https://shukuyonote.com/shukuyo/27/)です。' },
      { type: 'h2', text: '自分の宿がどれかは、日付で決まる' },
      { type: 'p', text: '名前を眺めて近い気質を選ぶのではありません。生まれた日を旧暦に直して、当たった宿が本命宿です。[調べ方](/shukuyo-note/keisan/)と、[月の宿帖の診断](https://shukuyonote.com/shukuyo/)を使ってください。' },
      { type: 'h2', text: '28宿の一覧と混ざらない' },
      { type: 'p', text: '二十八宿の表で結果を出すサイトとは、牛宿の有無で名前がずれます。[違い](/shukuyo-note/chigai/)と[28宿占い](/shukuyo-note/28shuku/)に分けてあります。' },
    ],
  },
  '28shuku': {
    slug: '28shuku',
    title: '28宿占い｜二十八宿と牛宿',
    description: '28宿占いは、牛宿を含む二十八宿で日を読むやり方です。宿曜の27宿とは一覧が違います。診断は月の宿帖です。',
    h1: '28宿占い',
    lead: '二十八宿は、27宿に牛宿を足した数え方です。日付を入れて確かめる場所は月の宿帖です。',
    actions: [
      { href: tool('/shukuyo/28/'), label: '月の宿帖で28宿を調べる' },
      { href: '/shukuyo-note/chigai/', label: '27宿との違い' },
    ],
    blocks: [
      { type: 'h2', text: '二十八宿には牛がある' },
      { type: 'p', text: '角、亢、氐、房、心、尾、箕、斗、牛、女、虚、危、室、壁、奎、婁、胃、昴、畢、觜、参、井、鬼、柳、星、張、翼、軫。斗と女のあいだに牛宿があります。宿曜の27宿は、この牛を数に入れません。' },
      { type: 'h2', text: '同じ誕生日でも、宿の名前が変わる' },
      { type: 'p', text: '27で出した本命宿と、28で出した宿は、期間の区切りがひとつ増えるぶん、日付の対応がずれます。どちらで出した結果なのかを見ずに比べると、計算ミスに見えます。理由は[27宿と28宿の違い](/shukuyo-note/chigai/)に書きました。' },
      { type: 'h2', text: '月の宿帖では、28宿を別に調べる' },
      { type: 'p', text: '宿曜の本命宿は27宿のままです。28宿として日付を確かめたいときは、[月の宿帖の28宿](https://shukuyonote.com/shukuyo/28/)を使います。27宿の性格を読みたいときは[27宿](/shukuyo-note/27shuku/)から[月の宿帖の27宿](https://shukuyonote.com/shukuyo/27/)へ進んでください。' },
    ],
  },
  chigai: {
    slug: 'chigai',
    title: '27宿と28宿の違い｜結果が食い違う理由',
    description: '宿曜の本命宿は27宿、二十八宿は牛宿を含む28です。同じ生年月日でも宿の名前が変わる理由を説明します。',
    h1: '27宿と28宿の違い',
    lead: '結果が二つあるときは、まず数え方が同じかを見てください。計算の確認は月の宿帖でできます。',
    actions: [
      { href: tool('/shukuyo/difference/'), label: '月の宿帖で違いを確認' },
      { href: tool('/shukuyo/28/'), label: '28宿を調べる' },
    ],
    blocks: [
      { type: 'h2', text: '違うのは、宿の数' },
      { type: 'p', text: '宿曜の本命宿は27宿です。28宿は牛宿を足した二十八宿です。月が天を一周する見方は近くても、区切りの数が違うので、日と宿の対応表は別物です。' },
      { type: 'h2', text: '牛宿があるかないか' },
      { type: 'p', text: '28の並びでは斗の次が牛、その次が女です。27の並びでは斗の次が女です。牛をまたぐ日付は、こちらでは女やその先の宿、あちらでは牛、というずれ方をします。名前が違うからといって、どちらかの足し算が必ず間違っているわけではありません。' },
      { type: 'h2', text: '旧暦の違いも重なる' },
      { type: 'p', text: '数え方が同じ27宿どうしでも、旧暦や閏月の扱いが違うと宿がずれることがあります。それは28宿との違いとは別の原因です。手順は[本命宿の調べ方](/shukuyo-note/keisan/)と、[月の宿帖の計算](https://shukuyonote.com/shukuyo/calculation/)を見てください。' },
      { type: 'h2', text: '比べるなら、同じ数え方で出す' },
      { type: 'p', text: '性格を宿曜として読むなら27宿です。[27宿の名前](/shukuyo-note/27shuku/)と[本命宿診断](https://shukuyonote.com/shukuyo/)を使います。二十八宿として確かめるなら[28宿](https://shukuyonote.com/shukuyo/28/)です。二つの結果を、説明なしに一つの宿へ混ぜないでください。' },
    ],
  },
  keisan: {
    slug: 'keisan',
    title: '本命宿の調べ方｜旧暦と閏月',
    description: '本命宿は、新暦の誕生日を旧暦に換算してから27宿に当てます。閏月で結果が変わる理由と、月の宿帖での確認先を説明します。',
    h1: '本命宿の調べ方',
    lead: '手計算の代用にはしません。どの順で考えると結果が安定するかを書き、算出は月の宿帖に任せます。',
    actions: [
      { href: tool('/shukuyo/calculation/'), label: '月の宿帖で計算を確認' },
      { href: tool('/shukuyo/'), label: '本命宿を診断する' },
    ],
    blocks: [
      { type: 'h2', text: '新暦の日付を、そのまま宿にしない' },
      { type: 'p', text: '本命宿は、生まれた日を旧暦の年月日に直してから、その月日が27宿のどれに当たるかで決まります。グレゴリオ暦の「何月何日」と宿を固定で結び付ける表は、年が変わるとずれます。' },
      { type: 'h2', text: '閏月があると、日の位置がずれる' },
      { type: 'p', text: '旧暦には、同じ月が二回続く閏月があります。閏月を前の月として数えるか、独立した月として数えるかで、あとの日付に割り当てる宿が変わります。サイトごとに結果が違うときの原因の一つが、ここです。' },
      { type: 'h2', text: '27宿で出す' },
      { type: 'p', text: '宿曜の本命宿は27宿です。28宿の表で数えると、牛宿の分だけ対応がずれます。その違いは[27宿と28宿の違い](/shukuyo-note/chigai/)に分けてあります。' },
      { type: 'h2', text: '確認は月の宿帖で' },
      { type: 'p', text: '旧暦への換算と宿への割り当ては、[月の宿帖の計算ページ](https://shukuyonote.com/shukuyo/calculation/)で日付を入れて確かめます。結果の宿から性格を読む入口は[27宿](/shukuyo-note/27shuku/)、診断の開始は[本命宿](https://shukuyonote.com/shukuyo/)です。' },
    ],
  },
}
