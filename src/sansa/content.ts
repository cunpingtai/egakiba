export type SansaBlock = { type: 'h1' | 'h2' | 'h3' | 'p'; text: string }

export type SansaPage = {
  slug: 'home' | 'how-to'
  title: string
  description: string
  blocks: SansaBlock[]
}

export type SansaLocaleId = 'ko' | 'ja' | 'fr' | 'en'

const koHome: SansaPage = {
  slug: 'home',
  title: '산사 온라인 절｜108배·염주 돌리기·가상 법당 이용 방법',
  description: '온라인 절 산사에서 가상 법당에 들어가 합장하고 절하며 염주를 108번 돌리는 방법, 방 입장, 소리 설정, 연결이 늦을 때 확인할 점을 알아보세요.',
  blocks: [
    { type: 'h1', text: '산사 온라인 절｜집에서 만나는 작은 가상 법당' },
    { type: 'p', text: '말을 걸지 않아도 괜찮아요. 잠시 앉아 절하고, 염주를 돌리며 쉬어 가는 공간.' },
    { type: 'p', text: '오늘은 잠깐 절에 다녀오고 싶은 날인가요? 산사(Sansa)는 브라우저에서 열리는 온라인 절입니다. 작은 동자승이 되어 가상 법당에 들어가고, 같은 공간에 있는 다른 동자승과 함께 합장하거나 절을 할 수 있습니다. **[이 페이지에서 들어가기](/ko/sansa/#play)**' },
    { type: 'h2', text: '산사 온라인 절이란?' },
    { type: 'p', text: '산사는 말을 주고받지 않아도 같은 법당에 머물 수 있는 가상 사찰입니다. 점수를 모으거나 상대와 겨루는 구조는 없고, 방석에 앉거나 염주를 한 알씩 넘기거나, 아무것도 하지 않고 머무는 쪽이 이 공간의 쓰임에 가깝습니다. 화면 속 체험의 처음 아이디어는 메타몽의 산사입니다.' },
    { type: 'h2', text: '산사에서 할 수 있는 일' },
    { type: 'h3', text: '합장하기' },
    { type: 'p', text: '다른 동자승과 마주치면 합장으로 인사할 수 있습니다. 채팅은 없고, 같은 공간에 있는 것으로 인사를 대신합니다.' },
    { type: 'h3', text: '절하기' },
    { type: 'p', text: '빈 방석을 찾아 절을 할 수 있습니다. 절하기를 누르면 예가 이어지고, 멈추기를 누르면 일어납니다. 108배를 끝까지 채울 필요는 없습니다.' },
    { type: 'h3', text: '염주 돌리기' },
    { type: 'p', text: '나무 염주를 한 알씩 넘기면 이번 바퀴와 전체 알 수가 표시됩니다. 108알이 한 바퀴입니다. 컴퓨터에서는 위아래로 쓸거나 방향키와 휠로 돌립니다. 조작은 [온라인 절 하는 법](/ko/sansa/how-to/)에 모아 두었습니다.' },
    { type: 'h3', text: '염불과 환경음' },
    { type: 'p', text: '환경음, 염불, 효과음을 따로 조절합니다. 소리가 필요 없으면 전체 소리를 끄면 됩니다. 염불 음원은 김용배의 공유마당 녹음이며, 불상 스캔은 국립중앙박물관 자료입니다.' },
    { type: 'h2', text: '방에 들어가는 방법' },
    { type: 'p', text: '청연당은 여러 방으로 나뉩니다. 방 이름 maru, maru-02처럼 보이는 번호는 단계가 아니라 같은 법당을 나누는 방입니다. 한 방이 가득 차면 목록에서 다른 방을 고르면 됩니다. 방마다 별도의 안내 페이지는 두지 않습니다.' },
    { type: 'h2', text: '자주 묻는 질문' },
    { type: 'h3', text: '산사는 무료인가요?' },
    { type: 'p', text: '이 페이지의 법당은 설치나 회원가입 없이 브라우저에서 들어갑니다.' },
    { type: 'h3', text: '108배를 꼭 해야 하나요?' },
    { type: 'p', text: '아닙니다. 합장만 하거나, 염주만 돌리거나, 조용히 앉아 있어도 됩니다.' },
    { type: 'h3', text: '산사는 실제 사찰인가요?' },
    { type: 'p', text: '아닙니다. 화면 안에 만든 가상 법당이며, 실제 사찰의 예불이나 방문을 대신하지 않습니다.' },
    { type: 'h3', text: '사람이 많아 보이면요?' },
    { type: 'p', text: '다른 청연당 방을 고르거나, 잠시 뒤 다시 들어가면 됩니다. 연결이 느릴 때는 법당 준비가 끝날 때까지 기다린 뒤 바닥을 눌러 이동합니다.' },
    { type: 'p', text: '같은 체험을 [日本語](/ja/sansa-online-temple/), [Français](/fr/sansa/), [English](/en/sansa/)로도 열 수 있습니다.' },
  ],
}

const koHow: SansaPage = {
  slug: 'how-to',
  title: '온라인 절 하는 법｜산사에서 합장·절·염주 돌리기',
  description: '산사 온라인 절에서 법당에 들어가 바닥을 눌러 걷고, 합장하고, 절하고, 염주를 108알까지 돌리는 조작을 정리했습니다.',
  blocks: [
    { type: 'h1', text: '온라인 절 하는 법' },
    { type: 'p', text: '산사에서는 설치 없이 가상 법당에 들어갑니다. 아래는 화면 안의 조작입니다. **[법당으로 들어가기](/ko/sansa/#play)**' },
    { type: 'h2', text: '둘러보고 걷기' },
    { type: 'p', text: '컴퓨터에서는 바닥을 클릭하면 그곳까지 걷습니다. 드래그로 둘러보고, 휠로 확대하거나 줄입니다. 방향키로도 이동합니다. 손에서는 바닥을 눌러 걷고, 한 손가락으로 둘러보고, 두 손가락으로 확대·축소합니다.' },
    { type: 'h2', text: '합장과 절' },
    { type: 'p', text: '합장을 누르면 두 손을 모아 인사합니다. 절하기를 누르면 절이 이어지고, 멈추기를 누르면 일어납니다. 빈 방석이 없으면 조금 둘러본 뒤 다시 누릅니다. 108배를 마치지 않아도 언제든 멈출 수 있습니다.' },
    { type: 'h2', text: '염주' },
    { type: 'p', text: '염주 화면에서 알을 잡고 위아래로 넘깁니다. 화살표 키와 휠로도 돌아갑니다. 이번 바퀴의 알 수와, 108알이 모였을 때의 바퀴 수가 표시됩니다. 법당에 들어가기 전에도 염주를 먼저 열 수 있습니다.' },
    { type: 'h2', text: '소리와 방' },
    { type: 'p', text: '환경음, 염불, 효과음은 설정에서 따로 바꿉니다. 청연당 목록에서 다른 방으로 옮기면 같은 법당의 다른 자리에 들어갑니다. 방 번호는 단계가 아닙니다.' },
    { type: 'p', text: '소개는 [산사 온라인 절](/ko/sansa/)에 있습니다.' },
  ],
}

const jaHome: SansaPage = {
  slug: 'home',
  title: '韓国で話題のオンライン寺院「산사（Sansa）」｜数珠を回せる無料ブラウザ体験',
  description: '韓国のオンライン寺院「산사（Sansa）」をブラウザで開けます。仮想の本堂で合掌やお辞儀、108玉の数珠を回す体験、部屋の入り方、音の設定をまとめています。',
  blocks: [
    { type: 'h1', text: '韓国で話題のオンライン寺院「산사」とは？' },
    { type: 'p', text: '言葉をかけなくても大丈夫です。しばらく座って礼をし、数珠を回して休む場所。' },
    { type: 'p', text: '산사（Sansa）は、ブラウザで入るオンラインの寺院です。画面に広がるのは、仏像のある静かな本堂。小さなお坊さんになって、合掌したり、数珠を一玉ずつ動かしたりできます。同じ空間にほかの人もいますが、会話を続ける必要はありません。**[このページで入る](/ja/sansa-online-temple/#play)**' },
    { type: 'h2', text: '何ができる？' },
    { type: 'p', text: '合掌、お辞儀、108玉の数珠、読経を聴くこと、何もせず座っていること。競争や得点はありません。最初の着想は、メタモンの산사です。日本の寺院の予約サイトではなく、韓国で広まった仮想の本堂として置いています。操作は[遊び方](/ja/sansa-online-temple/how-to/)にまとめています。' },
    { type: 'h3', text: '合掌とお辞儀' },
    { type: 'p', text: '合掌で、同じお堂にいる人へあいさつします。お辞儀は続き、止まるを押すと立ち上がります。108回まで続ける必要はありません。' },
    { type: 'h3', text: '数珠' },
    { type: 'p', text: '木の数珠を上下に送ると、この周の玉数と、108玉ごとの周数が表示されます。パソコンでは矢印キーとホイールでも回せます。' },
    { type: 'h3', text: '音と部屋' },
    { type: 'p', text: '環境音、読経、効果音は別々に変えられます。清蓮堂の部屋は、同じお堂を分ける席です。maru や maru-02 はステージ番号ではありません。いっぱいの部屋は、一覧から別の部屋を選びます。' },
    { type: 'h2', text: 'よくある質問' },
    { type: 'h3', text: '無料で入れますか？' },
    { type: 'p', text: 'このページの本堂は、インストールも会員登録もなく、ブラウザで開けます。' },
    { type: 'h3', text: '実際の寺院ですか？' },
    { type: 'p', text: '画面の中の仮想の本堂です。実際の寺院の参拝や予約の代わりにはなりません。' },
    { type: 'p', text: '同じ体験は [한국어](/ko/sansa/)、[Français](/fr/sansa/)、[English](/en/sansa/) でも開けます。' },
  ],
}

const jaHow: SansaPage = {
  slug: 'how-to',
  title: 'オンライン寺院「산사」の遊び方｜合掌・お辞儀・数珠',
  description: '韓国のオンライン寺院「산사」で、床を押して歩き、合掌し、お辞儀し、108玉の数珠を回す操作をまとめました。',
  blocks: [
    { type: 'h1', text: 'オンライン寺院「산사」の遊び方' },
    { type: 'p', text: 'インストールなしで仮想の本堂に入ります。**[お堂に入る](/ja/sansa-online-temple/#play)**' },
    { type: 'h2', text: '見わたして歩く' },
    { type: 'p', text: 'パソコンでは床をクリックするとそこまで歩きます。ドラッグで見わたし、ホイールで拡大・縮小します。方向キーでも移動できます。手では、床を押して歩き、指1本で見わたし、2本の指で拡大・縮小します。' },
    { type: 'h2', text: '合掌とお辞儀' },
    { type: 'p', text: '合掌で両手を合わせてあいさつします。お辞儀を押すと礼が続き、止まるを押すと立ち上がります。空いている座布団がなければ、少し見わたしてからもう一度押します。' },
    { type: 'h2', text: '数珠と音' },
    { type: 'p', text: '数珠の画面で玉を持って上下に送ります。108玉で一周です。環境音、読経、効果音は設定で別々に変えられます。部屋を移っても、お堂そのものは同じです。' },
    { type: 'p', text: '紹介は[韓国のオンライン寺院「산사」](/ja/sansa-online-temple/)にあります。' },
  ],
}

const frHome: SansaPage = {
  slug: 'home',
  title: 'Sansa, temple en ligne｜salut, 108 perles et salle virtuelle',
  description: 'Entrez dans le temple en ligne Sansa. Dans la salle virtuelle, joignez les mains, inclinez-vous et faites passer 108 perles. Salles, sons et entrée expliqués.',
  blocks: [
    { type: 'h1', text: 'Sansa, le temple en ligne｜une petite salle depuis chez soi' },
    { type: 'p', text: 'Pas besoin de parler. Asseyez-vous un moment, inclinez-vous, et laissez passer les perles.' },
    { type: 'p', text: 'Sansa est un temple que l’on ouvre dans le navigateur. Vous devenez un petit moine dans une salle avec un bouddha. D’autres personnes sont dans le même espace, sans conversation à entretenir. **[Entrer sur cette page](/fr/sansa/#play)**' },
    { type: 'h2', text: 'Que peut-on y faire ?' },
    { type: 'p', text: 'Un salut les mains jointes, une révérence, un chapelet de 108 perles, un chant, ou simplement rester assis. Il n’y a ni score ni compétition. L’idée première vient du Sansa de Metamong. Ce n’est pas un site de réservation d’un temple réel. Le détail des gestes est sur [comment entrer](/fr/sansa/how-to/).' },
    { type: 'h3', text: 'Salut et révérence' },
    { type: 'p', text: 'Le salut joint les mains vers les personnes présentes. La révérence continue jusqu’à Arrêter. Les 108 inclinaisons ne sont pas obligatoires.' },
    { type: 'h3', text: 'Perles, sons et salles' },
    { type: 'p', text: 'Chaque perle passée compte, et 108 perles font un tour. L’ambiance, le chant et les effets se règlent séparément. Les noms maru et maru-02 sont des salles du même hall, pas des niveaux. Si une salle est pleine, on en choisit une autre.' },
    { type: 'h2', text: 'Questions fréquentes' },
    { type: 'h3', text: 'Faut-il installer quelque chose ?' },
    { type: 'p', text: 'Non. La salle de cette page s’ouvre dans le navigateur, sans compte.' },
    { type: 'h3', text: 'Est-ce un vrai temple ?' },
    { type: 'p', text: 'C’est une salle virtuelle. Elle ne remplace pas la visite d’un lieu réel.' },
    { type: 'p', text: 'La même salle existe en [한국어](/ko/sansa/), [日本語](/ja/sansa-online-temple/) et [English](/en/sansa/).' },
  ],
}

const frHow: SansaPage = {
  slug: 'how-to',
  title: 'Comment entrer dans le temple en ligne Sansa',
  description: 'Marcher dans la salle, joindre les mains, s’incliner et faire passer les 108 perles du temple en ligne Sansa.',
  blocks: [
    { type: 'h1', text: 'Comment entrer dans Sansa' },
    { type: 'p', text: 'Aucune installation. **[Entrer dans la salle](/fr/sansa/#play)**' },
    { type: 'h2', text: 'Regarder et marcher' },
    { type: 'p', text: 'Sur ordinateur, un clic au sol vous y mène. Glissez pour regarder autour, et la molette zoome. Les flèches déplacent aussi. Au doigt, touchez le sol pour marcher, glissez avec un doigt, et pincez avec deux doigts.' },
    { type: 'h2', text: 'Salut, révérence et perles' },
    { type: 'p', text: 'Le salut joint les mains. La révérence continue, et Arrêter vous relève. S’il n’y a pas de coussin libre, regardez un peu et réessayez. Dans l’écran des perles, tenez une perle et faites-la passer vers le haut ou le bas. 108 perles comptent un tour.' },
    { type: 'h2', text: 'Sons et salles' },
    { type: 'p', text: 'L’ambiance, le chant et les effets se règlent à part. Changer de salle Cheongyeon ouvre le même hall, ailleurs. Le numéro de salle n’est pas un niveau.' },
    { type: 'p', text: 'La présentation est sur [Sansa, le temple en ligne](/fr/sansa/).' },
  ],
}

const enHome: SansaPage = {
  slug: 'home',
  title: 'Sansa online temple｜bow, 108 beads, and a quiet virtual hall',
  description: 'Enter the Sansa online temple in your browser. Bow, join your hands, and turn 108 beads in a virtual hall. Rooms, sound, and how to begin are explained here.',
  blocks: [
    { type: 'h1', text: 'Sansa online temple｜a small hall you can enter from home' },
    { type: 'p', text: 'You do not have to speak. Sit for a while, bow, and turn the beads.' },
    { type: 'p', text: 'Sansa is an online temple that opens in the browser. You become a small monk in a hall with a Buddha. Other people share the space, and there is no chat to keep up. **[Enter on this page](/en/sansa/#play)**' },
    { type: 'h2', text: 'What you can do' },
    { type: 'p', text: 'A joined-hands greeting, a bow, a strand of 108 beads, a chant, or simply sitting. There is no score and no contest. The first idea comes from Metamong’s Sansa. This is a virtual hall from a Korean online temple, not a booking page for a physical one. The gestures are on [how to enter](/en/sansa/how-to/).' },
    { type: 'h3', text: 'Greeting and bowing' },
    { type: 'p', text: 'Gassho greets the people in the hall. Bow keeps going until you press Stop. You do not have to finish 108 bows.' },
    { type: 'h3', text: 'Beads, sound, and rooms' },
    { type: 'p', text: 'Each bead you move is counted, and 108 beads make one round. Ambience, chant, and effects have their own volumes. Names such as maru and maru-02 are rooms in the same hall, not levels. If one room is full, choose another from the list.' },
    { type: 'h2', text: 'Questions' },
    { type: 'h3', text: 'Is it free to enter?' },
    { type: 'p', text: 'The hall on this page opens in the browser, with no install and no account.' },
    { type: 'h3', text: 'Is this a real temple?' },
    { type: 'p', text: 'It is a virtual hall. It does not replace a visit to a real temple.' },
    { type: 'p', text: 'The same hall is also in [한국어](/ko/sansa/), [日本語](/ja/sansa-online-temple/), and [Français](/fr/sansa/).' },
  ],
}

const enHow: SansaPage = {
  slug: 'how-to',
  title: 'How to enter the Sansa online temple',
  description: 'Walk the hall, join your hands, bow, and turn the 108 beads in the Sansa online temple.',
  blocks: [
    { type: 'h1', text: 'How to enter Sansa' },
    { type: 'p', text: 'Nothing to install. **[Enter the hall](/en/sansa/#play)**' },
    { type: 'h2', text: 'Look around and walk' },
    { type: 'p', text: 'On a computer, click the floor to walk there. Drag to look around, and use the wheel to zoom. The arrow keys also move you. On a touch screen, tap the floor to walk, drag with one finger, and pinch with two fingers.' },
    { type: 'h2', text: 'Greeting, bowing, and beads' },
    { type: 'p', text: 'Gassho puts your hands together. Bow continues until Stop, which stands you up. If no cushion is free, look around and press again. On the bead screen, hold a bead and move it up or down. 108 beads make one round.' },
    { type: 'h2', text: 'Sound and rooms' },
    { type: 'p', text: 'Ambience, chant, and effects are separate. Switching Cheongyeon rooms opens the same hall in another seat. A room number is not a level.' },
    { type: 'p', text: 'The introduction is on the [Sansa online temple](/en/sansa/).' },
  ],
}

export const SANSA_PAGES: Record<SansaLocaleId, Record<'home' | 'how-to', SansaPage>> = {
  ko: { home: koHome, 'how-to': koHow },
  ja: { home: jaHome, 'how-to': jaHow },
  fr: { home: frHome, 'how-to': frHow },
  en: { home: enHome, 'how-to': enHow },
}
