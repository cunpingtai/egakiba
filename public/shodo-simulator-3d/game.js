(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------- 定数 ----------
  // 長さの単位：1 = 10cm
  const PAPER_W = 2.4;                 // 半紙の幅
  const PAPER_D = 3.3;                 // 半紙の縦の長さ
  const TEX_W = 768, TEX_H = 1056;     // 半紙テクスチャの解像度（px）。かすれの細かい筋が出るよう高めにする
  // お手本の字の画（評価用）：画ごとに、0〜100 の枠の中の線（点の列）と終わり方（tome とめ / hane はね / harai はらい）。
  // hane は最後の区間がはね。書き順の順に並べる。お手本の見た目はフォントの字で、この線は字の外枠に合わせて重ねる
  const ST = (e, ...n) => ({ e, p: n.reduce((a, v, i) => (i % 2 ? a[a.length - 1].push(v) : a.push([v]), a), []) });
  const STROKES = {
    '人': [ST('harai', 52,10, 50,35, 42,60, 28,80, 12,92), ST('harai', 50,40, 58,60, 70,78, 90,92)],
    '大': [ST('tome', 14,38, 86,36), ST('harai', 50,10, 50,40, 42,62, 28,80, 12,92), ST('harai', 51,42, 60,62, 72,78, 90,90)],
    '天': [ST('tome', 24,22, 76,20), ST('tome', 12,46, 88,44), ST('harai', 50,20, 50,46, 42,66, 28,82, 12,92), ST('harai', 51,48, 60,66, 72,80, 90,90)],
    '木': [ST('tome', 12,32, 88,30), ST('tome', 50,8, 50,94), ST('harai', 48,34, 40,52, 26,68, 10,80), ST('harai', 52,34, 62,52, 74,66, 92,78)],
    '山': [ST('tome', 50,10, 50,80), ST('tome', 16,38, 16,84, 84,84), ST('tome', 84,32, 84,92)],
    '川': [ST('harai', 22,14, 22,50, 18,72, 10,90), ST('tome', 50,22, 50,78), ST('tome', 80,10, 80,94)],
    '日': [ST('tome', 22,12, 22,90), ST('tome', 22,12, 78,12, 78,90), ST('tome', 22,50, 78,50), ST('tome', 22,88, 78,88)],
    '月': [ST('harai', 26,10, 26,60, 22,78, 12,94), ST('hane', 26,10, 76,10, 76,92, 64,84), ST('tome', 26,38, 76,38), ST('tome', 26,62, 76,62)],
    '中': [ST('tome', 18,28, 18,68), ST('tome', 18,28, 82,28, 82,68), ST('tome', 18,66, 82,66), ST('tome', 50,8, 50,96)],
    '王': [ST('tome', 18,14, 82,14), ST('tome', 24,50, 76,50), ST('tome', 50,14, 50,86), ST('tome', 10,88, 90,86)],
    '力': [ST('hane', 14,30, 82,30, 80,70, 72,90, 60,82), ST('harai', 50,8, 48,40, 38,66, 24,84, 10,94)],
    '心': [ST('tome', 14,50, 22,64), ST('hane', 34,30, 36,72, 44,86, 66,88, 80,74), ST('tome', 48,18, 56,32), ST('tome', 74,34, 84,50)],
    '水': [ST('hane', 50,8, 50,88, 40,80), ST('harai', 14,36, 38,36, 26,62, 10,78), ST('harai', 80,26, 62,44), ST('harai', 54,42, 66,62, 78,76, 92,86)],
    '火': [ST('tome', 18,34, 28,50), ST('harai', 82,30, 70,48), ST('harai', 50,8, 50,46, 40,68, 26,84, 10,94), ST('harai', 51,52, 62,70, 74,82, 90,92)],
    '永': [ST('tome', 46,6, 54,18), ST('hane', 30,26, 52,24, 52,90, 42,82), ST('harai', 14,44, 34,42, 22,66, 8,80), ST('harai', 84,32, 64,50), ST('harai', 56,50, 68,68, 78,80, 94,90)],
  };
  const CHARS = ['永', '大', '山', '心', '水'];   // 出題の候補（一覧にも出す）。ほかの字は入力欄から
  const CHAR_SIZE = 0.8;               // 1文字のときの字の枠の大きさ（半紙の幅に対する割合）
  const MAX_CHARS = 4;                 // 1枚に書ける字の数
  // 字の数ごとの並べ方：[枠の中心x(幅に対する割合), 中心y(高さに対する割合)] と枠の大きさ(幅に対する割合)。
  // 書道の作品の並びに合わせて、2〜3文字は縦一列、4文字は右の列から縦に2文字ずつ
  const LAYOUTS = {
    1: { size: CHAR_SIZE, at: [[0.5, 0.5]] },
    2: { size: 0.62, at: [[0.5, 0.27], [0.5, 0.73]] },
    3: { size: 0.41, at: [[0.5, 0.19], [0.5, 0.5], [0.5, 0.81]] },
    4: { size: 0.42, at: [[0.72, 0.29], [0.72, 0.71], [0.28, 0.29], [0.28, 0.71]] },
  };
  const MODEL_W = 0.08;                // 評価で墨を探す幅の基準（字の枠に対する割合）
  const MODEL_FONT_WEIGHT = 'bold';    // お手本の字の太さ
  // 好きな字：KanjiVG の筆順データ（画の線と書き順）をネットから読む。無い字は字の画像から推定する
  const KVG_URLS = () => [];
  const KVG_TIMEOUT = 6;               // 読み込みを待つ最長の秒数
  const KVG_SIZE = 109;                // KanjiVG の座標の大きさ
  const KVG_STEP = 3;                  // KanjiVG の線から点を取る間隔（KanjiVG の座標で）
  const KVG_HARAI = '㇒㇏㇇㇀㇓㇋';    // はらいで終わる画の種類（撇・捺・横撇・提など）
  const KVG_HANE = '㇚㇆㇂㇃㇟㇉㇌㇈㇁㇖㇙㇊';   // はねで終わる画の種類（鉤）
  const HOOK_ANGLE = 70;               // 線の終わり近くでこの角度（度）以上曲がっていたら、そこからをはねとみなす
  // 字の画像から推定するとき
  const SK_DS = 3;                     // 細線化するときの縮小率（何pxを1マスにするか）
  const SK_SPUR = 1.4;                 // これより短い枝（線の太さに対する倍率）はひげとして捨てる
  const SK_MIN = 0.06;                 // これより短い線（字の枠に対する割合）は評価しない
  const SK_TAPER = 0.6;                // 端の太さが中ほどのこの割合より細ければ、はらいとみなす
  const SNAP_STEP = 6;                 // 評価用の線をフォントの字に吸い付けるときの点の間隔（px）
  const SNAP_R = 0.12;                 // 吸い付ける範囲（字の枠に対する割合）
  const SNAP_RUN = 2.5;                // これより長く続く墨（交差や画の向きに沿った所）には吸い付けない（MODEL_W に対する倍率）
  const MODEL_FONT = '"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif JP",serif';   // お手本・印・点数の字体
  // 半紙の地のノイズ（和紙らしさ）：細かい粒・ゆるいムラ・薄い繊維
  const PAPER_GRAIN = 0.035;           // 1画素ごとの粒の濃さ（明るさの揺れ幅）
  const PAPER_BLOTCH = 0.03;           // ゆるいムラの濃さ
  const PAPER_BLOTCH_SIZE = [70, 22];  // ムラの大きさ（px、大・小の2段）
  const PAPER_FIBERS = 260;            // 繊維の本数
  const PAPER_FIBER_ALPHA = 0.06;      // 繊維の濃さ
  const MODEL_ALPHA = 0.2;             // お手本の薄さ（0〜1）

  // カメラ
  const CAM_FOV = 40;                  // 縦の画角（度）
  const CAM_ELEV = 62;                 // 見下ろす角度（度、90で真上）
  const CAM_LOOK = V3(0, 0, -0.45);    // カメラが向く点
  const LIGHT_AMB = 0.55;              // まわりからの光の強さ
  const LIGHT_SUN = 0.42;              // 影を落とす光の強さ
  const FIT_X = 0.92, FIT_Y = 0.88;    // 半紙と硯を画面のどこまで大きく映すか（画面の半分に対する割合）
  const BOTTOM_SPACE = 100;            // 決定ボタンのために画面の下に空ける高さ（px）

  // 腕（見た目だけ。肘は手首と肩から計算する）
  const UPPER_LEN = 3.0;               // 上腕の長さ
  const FORE_LEN = 2.7;                // 前腕の長さ
  const SHOULDER_REST = V3(2.7, 3.6, 4.0);   // 肩の基本位置
  const REACH_RATE = 0.93;             // 肩〜手首の距離の上限（腕の長さの合計に対する割合）。超えると体ごと寄る
  const ELBOW_POLE = V3(1, -0.15, 0.35);    // 肘が張り出す向き

  // 手先ラグドール（手首より先は物理で揺れる）
  // 書道の持ち方（双鉤法）：人差し指・中指を軸の向こう側に掛け、親指を手前から当てて挟む。薬指・小指は手前から添える
  // 手のモデルの座標：x 親指側、y 手の甲側、z 指先側、原点が手首
  const HAND_GRIP = V3(0.15, -0.62, 1.33);   // モデルの中で筆の軸が通る点（人差し指の先と親指の先の間）
  const GRIP_UP = V3(1, 0.36, 0).normalize(); // モデルの中で筆の軸が上へ向かう向き（親指側。甲側へ少し傾けて手のひらをやや伏せる）
  const FINGER_FWD = V3(-0.55, 0, -0.82);    // 指先が向く水平の向き（左奥）
  const HAND_LEN = HAND_GRIP.length();       // 手首から筆を握る位置までの長さ
  // 手首→握りの向き（筆をまっすぐ立てたときの持ち方から計算する。力を抜くとこの向きへ戻ろうとする）
  const HAND_DIR = (() => {
    const up = V3(0, 1, 0), fw = V3(FINGER_FWD.x, 0, FINGER_FWD.z).normalize();
    const zm = V3(0, 0, 1).addScaledVector(GRIP_UP, -GRIP_UP.z).normalize();
    const world = new THREE.Matrix4().makeBasis(up, fw, V3(0, 0, 0).crossVectors(up, fw));
    const model = new THREE.Matrix4().makeBasis(GRIP_UP, zm, V3(0, 0, 0).crossVectors(GRIP_UP, zm));
    return HAND_GRIP.clone().applyMatrix4(world.multiply(model.transpose())).normalize();
  })();
  const HANDLE_LOW = 0.9;              // 握り位置から穂の付け根までの長さ
  const HANDLE_HIGH = 0.9;             // 握り位置から軸の上端までの長さ
  const BRISTLE_LEN = 0.45;            // 穂の長さ
  const WRIST_STIFF = 0.006;          // 手首の硬さ（1ステップで元の向きへ戻す割合。小さいほどぐらぐら）
  const GRIP_STIFF = 0.0032;           // 握りの硬さ（筆がまっすぐ下を向こうとする強さ。小さいほど筆が振れる）
  const BRISTLE_STRAIGHT = 0.25;       // 宙にある穂がまっすぐ戻る強さ
  const BRISTLE_STRAIGHT_ON = 0.01;    // 紙に触れている穂がまっすぐ戻る強さ
  const WRIST_LIMIT = 55;              // 手首が元の向きから曲がれる最大の角度（度）
  const BRUSH_LIMIT = 60;              // 筆が真下から傾ける最大の角度（度）。これ以上は手の上へひっくり返らない
  const FERRULE_MIN = 0.06;            // 穂の付け根が紙に近づける最低の高さ
  const GRAVITY = 25;                  // 重力（単位/秒²）
  const AIR_DAMP = 0.9925;              // 1ステップごとに残る速さの割合（1に近いほど揺れが収まりにくい）
  const PAPER_FRICTION = 0.7;          // 穂先が紙に触れているときの摩擦（1で止まる）
  const STEP = 1 / 240;                // 物理の1ステップ（秒）
  const ITER = 6;                      // 1ステップあたりの拘束計算の回数

  // 手と筆の見た目（物理には関係しない）
  const HANDLE_R = 0.045;              // 筆の軸の太さ（半径）
  const HAND_BALL_R = 0.18;            // 手の球の半径（ドラえもんのような丸い手。筆は球の中心を通して持つ）
  const BR_R = 0.062;                  // 穂のいちばん太い所の半径
  const BR_SEG = 14, BR_RAD = 12;      // 穂の形の細かさ（長さ方向・まわり方向の分割数）

  // 操作
  const FOLLOW_K = 85;                 // 手首が指を追いかけるバネの強さ（小さいほど遅れてついてくる）
  const FOLLOW_DAMP = 2 * Math.sqrt(FOLLOW_K) * 0.52; // 手首の追従の減衰（小さいほど行き過ぎて戻る）
  const LIFT = 0.55;                   // 指を離しているときに筆を持ち上げる高さ
  const PRESS_MIN = 0.04;              // 速く動かしているときの押し込み
  const PRESS_MAX = 0.26;              // 止めているときの押し込み
  const SPEED_FULL = 2.5;              // この速さ（単位/秒）以上で押し込みが最も浅くなる
  const PRESS_RATE = 3;                // 押し込みが変わる速さ（1/秒）
  const ARRIVE_DIST = 0.12;            // 手首が目標にこの距離まで近づいてから筆を下ろす
  const LONG_PRESS = 0.35;             // タッチ：指をこの秒数止めると書き始める
  const LONG_PRESS_SLOP = 8;           // タッチ：この距離（px）までの指の揺れは止めているとみなす
  const TARGET_R = 0.07;               // タッチ：筆を下ろす位置の印の半径
  const TARGET_IN = 0.7;               // タッチ：印の輪の内側の半径（TARGET_R に対する割合）。長押しのゲージも同じ輪に重ねる
  const GAUGE_SEG = 64;                // ゲージの輪の分割数
  const GAUGE_SHOW = 0.25;             // 長押しがこの割合まで進んでからゲージを出す
  const MOVE_MARGIN = 0.5;             // 半紙の外へ動かせる幅
  const REST_AIM = V3(1.7, 0, 2.0);    // 書き終えたあと手をどける位置
  // 始めるときの筆の位置：墨だまりの真上（硯の位置が決まってから入れる）
  const START_AIM = V3(0, 0, 0);

  // 墨
  const INK_R_MIN = 0.012;             // 穂先が触れただけのときの線の半径
  const INK_R_PER = 0.30;              // 押し込み1あたりの線の半径の増え
  const STAMP_GAP = 0.3;               // 線を描くときの点の間隔（半径に対する割合）
  const INK_USE = 1.6;                   // 書いた長さ×線の半径 1あたりに減る筆の墨の量（含ませきった状態=1）
  const KASURE_START = 0.35;           // 筆の墨がこの量より少なくなると、かすれる
  const BRISTLES = 56;                 // かすれを描くときの穂の毛の数
  const KASURE_EDGE = 0.4;             // 縁の毛ほど先に墨が切れる度合い
  // 墨の途切れ方のまだら模様の大きさ：[毛の本数, 書いた長さ(px)] の2段（大きなまだら＋細かいまだら）
  const KASURE_NOISE = [[3, 40, 0.5], [1.2, 12, 0.3], [0.6, 4, 0.2]];   // [毛方向の大きさ, 長さ方向の大きさ, 重み]
  // 机に書いた墨（採点には関係しない）：机のうち筆が届く範囲だけテクスチャを持つ
  const DESK_INK_W = 4.4, DESK_INK_D = 6.0;   // 範囲の幅・奥行き
  const DESK_INK_Z = -0.45;            // 範囲の中心（奥行き）
  const DESK_INK_PX = 160;             // 1あたりのpx（半紙より粗くてよい）
  const INK_R_SMOOTH = 0.12;           // 線の太さの変化をならす時間（秒）。大きいほど太さがゆっくり変わる
  const INK_POS_SMOOTH = 0.03;         // 墨を置く位置の細かいぶれをならす時間（秒）
  const INK_REACH = 0.05;              // 穂先が紙からこの高さまでは毛先が触れているとみなす（細かく跳ねても線が切れないように）
  const LIFT_THIN = 0.9;               // 浮きかけたときに細くなる割合（INK_REACH の高さでこの割合だけ細くなる）。持ち上げると先が細く抜ける

  // 硯（すずり）：半紙の奥に置く。左側が墨だまり（海）、右側が平らな所（陸）
  const STONE_W = 1.8, STONE_D = 1.0;  // 硯の幅・奥行き
  const STONE_X = 0.3;                 // 硯の中心（左右）
  const STONE_Z = -PAPER_D / 2 - 0.2 - STONE_D / 2;   // 硯の中心（奥行き）
  const RIM = 0.1;                     // 縁の幅
  const RIM_H = 0.25;                  // 縁の高さ
  const LAND_H = 0.2;                  // 陸の高さ
  const POOL_FLOOR = 0.06;             // 墨だまりの底の高さ
  const POOL_SURF = 0.16;              // 墨だまりの墨の表面の高さ
  const POOL_RATE = 0.38;              // 硯の内側のうち墨だまりが占める割合
  const LOAD_RATE = 1.6;               // 穂を墨に浸したときに墨を含む速さ（1/秒、浸かった深さ0.1あたり）

  // 採点：点数 = 形の重なり・画を書けた割合・とめはねはらい の重み付き
  const W_SHAPE = 0.35, W_COVER = 0.2, W_TECH = 0.45;
  const EVAL_N = 30;                   // 1画あたり墨の太さを測る点の数
  const GRADE_PT = [0, 0.15, 0.5, 1];  // ×・△・○・◎ の点
  const GRID = 9;                      // 何pxを1マスとして比べるか
  const TOLERANCE = 1;                 // はみ出し・書き漏らしを許すマス数

  // 評価の演出
  const RANKS = [[90, '特選'], [80, '金賞'], [70, '銀賞'], [60, '銅賞'], [45, '佳作'], [0, '努力賞']];   // 点数の下限と賞
  const GRADE_MARK = ['×', '△', '○', '◎'];
  const END_NAME = { tome: 'とめ', hane: 'はね', harai: 'はらい' };
  // 演出の時間割（秒）：半紙が出る → 画の終わりごとに朱で評価を書く → 印 → 点数を数え上げる → ボタン
  const JUDGE = { paperIn: 0.4, marks: 0.5, markGap: 0.3, markIn: 0.15, stampAfter: 0.3, stampIn: 0.18, countAfter: 0.3, count: 0.6, endAfter: 0.2 };
  const MARKS_MAX = 2.4;               // 評価を出し切るまでの最長の秒数
  const STAMP_ONE = 0.2;               // 印の大きさ（半紙の幅に対する割合）：1文字のとき
  const STAMP_MULTI = 0.14;            // 印の大きさ：複数の字のとき
  const MARK_OUT = 0.12;               // 評価を書く位置：画の終わりから字の外側へ離す量（字の枠に対する割合）

  // 共有
  const SHARE_INSTANT = 0.5;           // 共有がこの秒数より早くキャンセル扱いで終わったら、共有シートは出ていなかったとみなす
  const HASHTAG = '#書道シミュレーター3D';

  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  // ---------- 状態 ----------
  let state = 'playing';               // playing / over
  let char = '';
  let score = 0;

  // ---------- 硯と床の高さ ----------
  const SX0 = STONE_X - STONE_W / 2, SX1 = STONE_X + STONE_W / 2;
  const SZ0 = STONE_Z - STONE_D / 2, SZ1 = STONE_Z + STONE_D / 2;
  const POOL_X1 = SX0 + RIM + (STONE_W - RIM * 2) * POOL_RATE;   // 墨だまりの右端
  const inPool = (x, z) => x > SX0 + RIM && x < POOL_X1 && z > SZ0 + RIM && z < SZ1 - RIM;
  // その場所の床の高さ（硯の上なら縁・陸・墨だまりの底）
  function groundAt(x, z){
    if (x < SX0 || x > SX1 || z < SZ0 || z > SZ1) return 0;
    if (x < SX0 + RIM || x > SX1 - RIM || z < SZ0 + RIM || z > SZ1 - RIM) return RIM_H;
    return x < POOL_X1 ? POOL_FLOOR : LAND_H;
  }

  // ---------- 半紙（お手本・墨・合成） ----------
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const modelCv = mkCanvas(TEX_W, TEX_H), modelCtx = modelCv.getContext('2d');
  const inkCv = mkCanvas(TEX_W, TEX_H), inkCtx = inkCv.getContext('2d');
  const paperCv = mkCanvas(TEX_W, TEX_H), paperCtx = paperCv.getContext('2d');
  const paperBaseCv = mkCanvas(TEX_W, TEX_H);   // ノイズ入りの半紙の地（はじめに1回だけ作る）
  let paperDirty = true;

  // ---------- お手本（テクスチャの座標） ----------
  const BOX = TEX_W * CHAR_SIZE;       // 1文字のときの字の枠の大きさ（px）
  let CELL = BOX;                      // いまの字の枠の大きさ（px）。字の数で変わる
  let MODEL_PX = MODEL_W * CELL;       // 評価で墨を探す幅の基準（px）
  let brushScale = 1;                  // 筆の太さの倍率（1文字の字の大きさに対する、いまの字の大きさ）
  // 画の線を、長さで位置を引ける形にする。fit：0〜100 の座標を字の外枠に合わせて置く
  function strokePath(st, fit){
    const pts = st.p.map(([x, y]) => ({ x: fit.x0 + (x - fit.mx0) * fit.sx, y: fit.y0 + (y - fit.my0) * fit.sy }));
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const len = cum[cum.length - 1];
    return { st, pts, cum, len, hookFrom: st.e === 'hane' ? cum[st.h != null ? st.h : cum.length - 2] : len };
  }
  // 長さ s の所の位置と向き
  function pointAt(path, s){
    const { pts, cum } = path;
    let i = 1;
    while (i < pts.length - 1 && cum[i] < s) i++;
    const a = pts[i - 1], b = pts[i], l = cum[i] - cum[i - 1] || 1, t = Math.min(1, Math.max(0, (s - cum[i - 1]) / l));
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, tx: (b.x - a.x) / l, ty: (b.y - a.y) / l };
  }
  let modelPaths = [];
  // お手本はフォントの字をそのまま描き、評価用の画の線を字の外枠（墨のある範囲）に合わせる。字が複数なら枠ごとに
  function drawModel(){
    modelCtx.clearRect(0, 0, TEX_W, TEX_H);
    const glyphs = [...char].slice(0, MAX_CHARS), lay = LAYOUTS[glyphs.length];
    CELL = TEX_W * lay.size;
    MODEL_PX = MODEL_W * CELL;
    brushScale = CELL / BOX;   // 字が小さいほど細い筆で書く（線の太さと穂の太さ）
    const cells = lay.at.map(([x, y]) => ({ cx: TEX_W * x, cy: TEX_H * y }));
    const px = Math.round(CELL);
    modelCtx.font = `${MODEL_FONT_WEIGHT} ${px}px ${MODEL_FONT}`;
    modelCtx.textAlign = 'center';
    modelCtx.textBaseline = 'alphabetic';
    modelCtx.fillStyle = '#000';
    glyphs.forEach((g, i) => {
      // 字の実際の上下から中心を出す（フォントごとの余白の差をなくす）
      const m = modelCtx.measureText(g);
      const asc = m.actualBoundingBoxAscent || px * 0.85, desc = m.actualBoundingBoxDescent || px * 0.1;
      modelCtx.fillText(g, cells[i].cx, cells[i].cy + (asc - desc) / 2);
    });
    const d = modelCtx.getImageData(0, 0, TEX_W, TEX_H).data;
    modelPaths = [];
    let guessed = false;
    glyphs.forEach((g, i) => {
      const c = cells[i], rx0 = Math.max(0, Math.floor(c.cx - CELL * 0.55)), rx1 = Math.min(TEX_W - 1, Math.ceil(c.cx + CELL * 0.55));
      const ry0 = Math.max(0, Math.floor(c.cy - CELL * 0.55)), ry1 = Math.min(TEX_H - 1, Math.ceil(c.cy + CELL * 0.55));
      // 字の外枠（この字の枠の中だけを見る）
      let gx0 = TEX_W, gy0 = TEX_H, gx1 = 0, gy1 = 0;
      for (let y = ry0; y <= ry1; y++) for (let x = rx0; x <= rx1; x++){
        if (d[(y * TEX_W + x) * 4 + 3] > 100){ if (x < gx0) gx0 = x; if (x > gx1) gx1 = x; if (y < gy0) gy0 = y; if (y > gy1) gy1 = y; }
      }
      const tag = p => Object.assign(p, { cx: c.cx, cy: c.cy });   // 評価を書く位置を決めるため、字の中心を持たせる
      // 画のデータ：内蔵 → KanjiVG → どちらも無ければ字の画像から推定
      const src = STROKES[g] || kvgCache.get(g);
      if (!src){
        guessed = true;
        if (gx1 > gx0) modelPaths.push(...analyzeGlyph(d, [rx0, ry0, rx1, ry1]).map(tag));
        return;
      }
      // 画の線の外枠（線の太さの半分だけ内側に入るよう、字の外枠を少し縮めて合わせる）
      const all = src.flatMap(st => st.p);
      const mx0 = Math.min(...all.map(p => p[0])), mx1 = Math.max(...all.map(p => p[0]));
      const my0 = Math.min(...all.map(p => p[1])), my1 = Math.max(...all.map(p => p[1]));
      const inset = MODEL_PX * 0.35;
      const fit = {
        x0: gx0 + inset, y0: gy0 + inset, mx0, my0,
        sx: Math.max(1, gx1 - gx0 - inset * 2) / Math.max(1, mx1 - mx0),
        sy: Math.max(1, gy1 - gy0 - inset * 2) / Math.max(1, my1 - my0),
      };
      modelPaths.push(...src.map(st => tag(snapPath(strokePath(st, fit), d))));
    });
    $('guess-mark').classList.toggle('hidden', !guessed);   // 推定している字があるときだけ印を出す（開発者向け）
  }
  // ---------- 好きな字：KanjiVG の読み込み ----------
  const kvgCache = new Map();   // 字 → 画のデータ（このページを開いている間だけ覚える）
  // 線の終わり近くで大きく曲がる所（はねの始まり）の点の番号
  function hookIndex(pts){
    const n = pts.length, ang = (a, b, c) => {
      const ux = b[0] - a[0], uy = b[1] - a[1], vx = c[0] - b[0], vy = c[1] - b[1];
      return Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / ((Math.hypot(ux, uy) * Math.hypot(vx, vy)) || 1)))) * 180 / Math.PI;
    };
    for (let j = n - 3; j >= Math.floor(n * 0.6) && j >= 2; j--) if (ang(pts[j - 2], pts[j], pts[j + 2]) >= HOOK_ANGLE) return j;
    return -1;
  }
  // 画の種類（kvg:type）から終わり方を決める。種類が無ければ形から決める
  function kvgEnd(type, pts){
    if (type && [...KVG_HANE].some(c => type.includes(c))) return 'hane';
    if (type && [...KVG_HARAI].some(c => type.includes(c))) return 'harai';
    if (!type && hookIndex(pts) >= 0) return 'hane';
    return 'tome';
  }
  function parseKanjiVG(text){
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const num = el => +(el.getAttribute('id').match(/-s(\d+)$/) || [0, 0])[1];
    const paths = [...doc.querySelectorAll('path')].filter(el => /-s\d+$/.test(el.getAttribute('id') || '')).sort((a, b) => num(a) - num(b));
    // 線の長さと途中の点を測るため、見えない SVG に入れる
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('style', 'position:absolute;width:0;height:0;visibility:hidden');
    document.body.appendChild(svg);
    const out = paths.map(el => {
      const pe = document.createElementNS(NS, 'path');
      pe.setAttribute('d', el.getAttribute('d'));
      svg.appendChild(pe);
      const L = pe.getTotalLength(), n = Math.max(4, Math.ceil(L / KVG_STEP)), pts = [];
      for (let i = 0; i <= n; i++){ const q = pe.getPointAtLength(L * i / n); pts.push([q.x * 100 / KVG_SIZE, q.y * 100 / KVG_SIZE]); }
      const e = kvgEnd(el.getAttribute('kvg:type'), pts);
      const h = e === 'hane' ? hookIndex(pts) : -1;
      return { e, p: pts, h: h >= 0 ? h : undefined };
    });
    svg.remove();
    return out;
  }
  async function loadKanjiVG(c){
    const hex = c.codePointAt(0).toString(16).padStart(5, '0');
    for (const url of KVG_URLS(hex)){
      const ctrl = new AbortController(), tm = setTimeout(() => ctrl.abort(), KVG_TIMEOUT * 1000);
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) continue;
        const strokes = parseKanjiVG(await res.text());
        if (strokes.length) return strokes;
      } catch (err) { /* 読めなければ次の場所、それも駄目なら推定へ */ }
      finally { clearTimeout(tm); }
    }
    return null;
  }

  // ---------- 好きな字：字の画像からの推定（KanjiVG に無い字） ----------
  // 字を細線化して骨組みにし、線の端ごとに「どの向きから来て、端がどう終わっているか」を推定する。書き順は分からない
  // rect：この字の枠 [x0, y0, x1, y1]（ほかの字は見ない）
  function analyzeGlyph(d, rect){
    const W = Math.floor(TEX_W / SK_DS), H = Math.floor(TEX_H / SK_DS);
    const img = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
      const tx = x * SK_DS + 1, ty = y * SK_DS + 1;
      if (tx < rect[0] || tx > rect[2] || ty < rect[1] || ty > rect[3]) continue;
      img[y * W + x] = d[(ty * TEX_W + tx) * 4 + 3] > 100 ? 1 : 0;
    }
    // Zhang-Suen の細線化
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : img[y * W + x];
    for (let changed = true; changed;){
      changed = false;
      for (let pass = 0; pass < 2; pass++){
        const del = [];
        for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++){
          if (!img[y * W + x]) continue;
          const p = [at(x, y - 1), at(x + 1, y - 1), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1), at(x - 1, y + 1), at(x - 1, y), at(x - 1, y - 1)];
          const b = p.reduce((a, v) => a + v, 0);
          let a = 0;
          for (let k = 0; k < 8; k++) if (!p[k] && p[(k + 1) % 8]) a++;
          const c1 = pass === 0 ? p[0] * p[2] * p[4] : p[0] * p[2] * p[6];
          const c2 = pass === 0 ? p[2] * p[4] * p[6] : p[0] * p[4] * p[6];
          if (b >= 2 && b <= 6 && a === 1 && !c1 && !c2) del.push(y * W + x);
        }
        for (const i of del) img[i] = 0;
        if (del.length) changed = true;
      }
    }
    const nbr = i => {
      const x = i % W, y = (i / W) | 0, out = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && at(x + dx, y + dy)) out.push((y + dy) * W + x + dx);
      return out;
    };
    // 周りを一周したときに線へ入る回数：1 なら端、3 以上なら分かれ目（階段状の斜め線を分かれ目と間違えない）
    const crossings = i => {
      const x = i % W, y = (i / W) | 0;
      const p = [at(x, y - 1), at(x + 1, y - 1), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1), at(x - 1, y + 1), at(x - 1, y), at(x - 1, y - 1)];
      let c = 0;
      for (let k = 0; k < 8; k++) if (!p[k] && p[(k + 1) % 8]) c++;
      return c;
    };
    // 端から骨組みをたどり、分かれ目か反対の端までを1本の枝にする
    const ends = [];
    for (let i = 0; i < W * H; i++) if (img[i] && crossings(i) === 1) ends.push(i);
    const strokeW = MODEL_PX / SK_DS, seen = new Set(), branches = [];
    for (const e0 of ends){
      if (seen.has(e0)) continue;
      const chain = [e0], inChain = new Set(chain);
      let cur = e0, junction = false;
      for (let guard = 0; guard < W * H; guard++){
        const nx = nbr(cur).filter(v => !inChain.has(v));
        if (!nx.length) break;
        // 縦横のとなりを先に選ぶ（斜めと縦横の両方が残る階段を1本として進む）
        const cx = cur % W;
        const next = nx.find(v => Math.abs((v % W) - cx) + Math.abs(((v / W) | 0) - ((cur / W) | 0)) === 1) || nx[0];
        cur = next; chain.push(cur); inChain.add(cur);
        for (const v of nx) inChain.add(v);   // 同じ所へ戻らない
        if (crossings(cur) >= 3){ junction = true; break; }
        if (crossings(cur) === 1) break;
      }
      const endAtEnd = !junction && crossings(cur) === 1;
      if (endAtEnd) seen.add(cur);
      if (junction && chain.length < strokeW * SK_SPUR) continue;   // ひげ
      branches.push({ pts: chain.map(i => ({ x: (i % W) * SK_DS + 1, y: ((i / W) | 0) * SK_DS + 1 })), free: endAtEnd });
    }
    // 書き進む向きを決める：右・下へ向かって書くのが基本。分かれ目から伸びる枝で、端が左・上にあるものは画の書き始め
    const forward = (a, b) => (b.y - a.y) + 0.6 * (b.x - a.x);
    const paths = [];
    for (const br of branches){
      let pts = br.pts, e = null;
      if (br.free){ if (forward(pts[0], pts[pts.length - 1]) < 0) pts = pts.reverse(); }
      else {
        pts = pts.reverse();   // 分かれ目 → 端
        if (forward(pts[0], pts[pts.length - 1]) < 0) e = 'none';
      }
      // 階段状のがたつきをならす
      for (let k = 0; k < 2; k++) pts = pts.map((p, i) => i === 0 || i === pts.length - 1 ? p : { x: (pts[i - 1].x + p.x * 2 + pts[i + 1].x) / 4, y: (pts[i - 1].y + p.y * 2 + pts[i + 1].y) / 4 });
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
      const len = cum[cum.length - 1];
      if (len < SK_MIN * CELL) continue;
      const path = { st: { e: e || 'tome' }, pts, cum, len, hookFrom: len };
      if (!e){
        // はね：終わり近くで大きく曲がる。はらい：端へ向かって細くなる。どちらでもなければとめ
        const h = hookIndex(pts.map(p => [p.x, p.y]));
        if (h >= 0 && len - cum[h] < strokeW * SK_DS * 2.5){ path.st.e = 'hane'; path.hookFrom = cum[h]; }
        else {
          const wAt = s => { const q = pointAt(path, s); return glyphWidth(d, q.x, q.y, -q.ty, q.tx); };
          const body = wAt(len * 0.5), tip = wAt(Math.max(0, len - MODEL_PX * 0.6));
          if (body > 0 && tip < body * SK_TAPER) path.st.e = 'harai';
        }
      }
      paths.push(path);
    }
    // 書き順の代わりに、上から・左からの順に並べる（評価を出す順）
    return paths.sort((a, b) => (a.pts[0].y + a.pts[0].x * 0.3) - (b.pts[0].y + b.pts[0].x * 0.3));
  }
  // お手本の字の、(x, y) を通り (nx, ny) の向きに並ぶ墨の幅（px）
  function glyphWidth(d, x, y, nx, ny){
    const ink = (t) => {
      const xi = Math.round(x + nx * t), yi = Math.round(y + ny * t);
      return xi >= 0 && yi >= 0 && xi < TEX_W && yi < TEX_H && d[(yi * TEX_W + xi) * 4 + 3] > 100;
    };
    if (!ink(0)) return 0;
    let a = 0, b = 0;
    while (a < MODEL_PX * 3 && ink(-a - 1)) a++;
    while (b < MODEL_PX * 3 && ink(b + 1)) b++;
    return a + b + 1;
  }

  // 評価用の線を、表示したフォントの字の画の中心へ吸い付ける（フォントによって字形が違っても線が字に乗るように）
  function snapPath(path, d){
    const ink = (x, y) => {
      const xi = Math.round(x), yi = Math.round(y);
      return xi >= 0 && yi >= 0 && xi < TEX_W && yi < TEX_H && d[(yi * TEX_W + xi) * 4 + 3] > 100;
    };
    const R = Math.round(SNAP_R * CELL), maxRun = MODEL_PX * SNAP_RUN;
    // 細かく打ち直した点を、横切る向きに見て一番近い墨の帯の中心へ動かす
    const n = Math.max(2, Math.ceil(path.len / SNAP_STEP));
    const hookIdx = Math.round(path.hookFrom / path.len * n);
    let pts = [];
    for (let i = 0; i <= n; i++){
      const q = pointAt(path, path.len * i / n);
      let best = null, bestD = Infinity, run = 0, start = 0;
      for (let t = -R; t <= R + 1; t++){
        if (t <= R && ink(q.x - q.ty * t, q.y + q.tx * t)){ if (!run) start = t; run++; }
        else if (run){
          const c = start + run / 2;
          if (run <= maxRun && Math.abs(c) < bestD){ bestD = Math.abs(c); best = c; }
          run = 0;
        }
      }
      pts.push(best === null ? { x: q.x, y: q.y } : { x: q.x - q.ty * best, y: q.y + q.tx * best });
    }
    // ならす（となりの点と平均）
    pts = pts.map((p, i) => i === 0 || i === pts.length - 1 ? p : { x: (pts[i - 1].x + p.x * 2 + pts[i + 1].x) / 4, y: (pts[i - 1].y + p.y * 2 + pts[i + 1].y) / 4 });
    // 終わりを、字の墨が続く所まで伸ばす／墨のない所なら縮める
    const a = pts[pts.length - 2], b = pts[pts.length - 1];
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1, tx = (b.x - a.x) / l, ty = (b.y - a.y) / l;
    let k = 0;
    while (k < R && ink(b.x + tx * (k + 1), b.y + ty * (k + 1))) k++;
    if (k === 0) while (k > -R && !ink(b.x + tx * (k - 1), b.y + ty * (k - 1))) k--;
    const m = k > 0 ? Math.max(0, k - MODEL_PX * 0.3) : k;   // 字の先端より少し手前を終わりにする
    pts[pts.length - 1] = { x: b.x + tx * m, y: b.y + ty * m };
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const len = cum[cum.length - 1];
    return { st: path.st, pts, cum, len, hookFrom: path.st.e === 'hane' ? cum[Math.min(hookIdx, cum.length - 2)] : len };
  }

  function composePaper(){
    paperCtx.globalAlpha = 1;
    paperCtx.drawImage(paperBaseCv, 0, 0);
    paperCtx.globalAlpha = MODEL_ALPHA;
    paperCtx.drawImage(modelCv, 0, 0);
    paperCtx.globalAlpha = 1;
    paperCtx.drawImage(inkCv, 0, 0);
    paperTex.needsUpdate = true;
  }

  // 墨を置く（世界座標の点 → テクスチャ）
  const toTexX = x => (x + PAPER_W / 2) / PAPER_W * TEX_W;
  const toTexY = z => (z + PAPER_D / 2) / PAPER_D * TEX_H;
  const texScale = TEX_W / PAPER_W;
  // 墨を置く面：半紙と机。ctx 描くキャンバス、tx/ty 世界の座標→キャンバスの座標、k 1あたりのpx、dirty 描き直しが要る
  const paperSurf = { ctx: inkCtx, tx: toTexX, ty: toTexY, k: texScale, dirty: false };
  const deskInkCv = mkCanvas(Math.round(DESK_INK_W * DESK_INK_PX), Math.round(DESK_INK_D * DESK_INK_PX));
  const deskSurf = {
    ctx: deskInkCv.getContext('2d'),
    tx: x => (x + DESK_INK_W / 2) * DESK_INK_PX,
    ty: z => (z - DESK_INK_Z + DESK_INK_D / 2) * DESK_INK_PX,
    k: DESK_INK_PX, dirty: false,
  };
  let surf = paperSurf;
  let brushInk = 0;                     // 筆が含んでいる墨（0〜1）
  // 途切れ方のまだら模様：となりの毛同士・書き進む向きになめらかにつながる値（0〜1）。墨をつけ直すたびに模様を変える
  let kasureSeed = 1;
  function newKasure(){ kasureSeed = (Math.random() * 1e9) | 0; }
  function hash2(x, y, seed = kasureSeed){
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, seed = kasureSeed){
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  // 半紙の地：1画素ずつ明るさを揺らして粒とムラを作り、その上に薄い繊維を散らす
  function makePaperBase(){
    const g = paperBaseCv.getContext('2d'), img = g.createImageData(TEX_W, TEX_H), d = img.data;
    const hex = css('--paper').replace('#', '');
    const base = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
    const [s1, s2] = PAPER_BLOTCH_SIZE;
    for (let y = 0; y < TEX_H; y++) for (let x = 0; x < TEX_W; x++){
      const blotch = 0.6 * vnoise(x / s1, y / s1, 7) + 0.4 * vnoise(x / s2, y / s2, 11) - 0.5;
      const f = 1 + blotch * PAPER_BLOTCH * 2 + (Math.random() - 0.5) * PAPER_GRAIN * 2;
      const k = (y * TEX_W + x) * 4;
      d[k] = base[0] * f; d[k + 1] = base[1] * f; d[k + 2] = base[2] * f; d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // 繊維：短く曲がった細い線
    g.lineCap = 'round';
    for (let i = 0; i < PAPER_FIBERS; i++){
      const x = Math.random() * TEX_W, y = Math.random() * TEX_H, a = Math.random() * Math.PI * 2, l = 8 + Math.random() * 30;
      const bend = (Math.random() - 0.5) * l * 0.6;
      g.strokeStyle = `rgba(90, 75, 50, ${PAPER_FIBER_ALPHA * (0.5 + Math.random())})`;
      g.lineWidth = 0.5 + Math.random() * 0.8;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * l / 2 - Math.sin(a) * bend, y + Math.sin(a) * l / 2 + Math.cos(a) * bend, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
  }
  // 毛 i が、書いた長さ L の所で墨を置くか：まだら模様＋縁の寄与が、墨の残りより小さければ置く
  function bristleInks(i, L, c){
    const u = (i + 0.5) / BRISTLES * 2 - 1;
    let n = 0;
    for (const [si, sl, w] of KASURE_NOISE) n += w * vnoise(i / si + w * 31, L / sl);
    return n + KASURE_EDGE * u * u < c * (1 + KASURE_EDGE) - 0.05;
  }
  function stampDot(x, z, r){
    surf.ctx.beginPath();
    surf.ctx.arc(surf.tx(x), surf.ty(z), Math.max(0.8, r * surf.k), 0, Math.PI * 2);
    surf.ctx.fill();
  }
  // かすれ：穂を細い毛の束として、墨が残っている毛だけが前の位置から今の位置まで線を引く。
  // 墨が減るほど、縁の毛から・毛ごとにまだらに途切れて、運筆の向きに沿った筋になる。(nx, nz)：線の進む向きに直交する向き
  function kasureLine(a, x, z, r, nx, nz, L){
    const R0 = Math.max(0.8, a.r * surf.k), R1 = Math.max(0.8, r * surf.k);
    const c = brushInk / KASURE_START;
    surf.ctx.lineCap = 'round';
    surf.ctx.strokeStyle = surf.ctx.fillStyle;
    surf.ctx.lineWidth = Math.max(0.8, (R0 + R1) / BRISTLES * 2.2);   // となりの毛と重なる太さ（付いた毛同士はつながって面になる）
    for (let i = 0; i < BRISTLES; i++){
      if (!bristleInks(i, L, c)) continue;
      const u = (i + 0.5) / BRISTLES * 2 - 1;
      surf.ctx.beginPath();
      surf.ctx.moveTo(surf.tx(a.x) + a.nx * u * R0, surf.ty(a.z) + a.nz * u * R0);
      surf.ctx.lineTo(surf.tx(x) + nx * u * R1, surf.ty(z) + nz * u * R1);
      surf.ctx.stroke();
    }
  }
  let lastStamp = null;   // 前のステップで墨を置いた位置 {x, z, r, nx, nz}
  function stampTo(x, z, r){
    if (brushInk <= 0){ lastStamp = null; return; }
    if (!lastStamp){
      if (brushInk >= KASURE_START) stampDot(x, z, r);
      lastStamp = { x, z, r, nx: 1, nz: 0, L: 0, fresh: true };   // fresh：まだ向きが決まっていない
    } else {
      // 前の点との間を埋める
      const dx = x - lastStamp.x, dz = z - lastStamp.z, d = Math.hypot(dx, dz);
      // 筋の向き：ほぼ止まっているときの細かい揺れで向きが回らないよう、なめらかに変える
      let nx = lastStamp.nx, nz = lastStamp.nz;
      if (d > 0.002){
        const k = lastStamp.fresh ? 1 : Math.min(1, d / 0.03);   // 書き始めは今の向きをそのまま使う
        nx += (-dz / d - nx) * k; nz += (dx / d - nz) * k;
        const l = Math.hypot(nx, nz) || 1;
        nx /= l; nz /= l;
      }
      if (brushInk >= KASURE_START){
        const n = Math.max(1, Math.ceil(d / (Math.min(r, lastStamp.r) * STAMP_GAP)));
        for (let i = 1; i <= n; i++){
          const t = i / n;
          stampDot(lastStamp.x + dx * t, lastStamp.z + dz * t, lastStamp.r + (r - lastStamp.r) * t);
        }
      } else {
        if (lastStamp.fresh){ lastStamp.nx = nx; lastStamp.nz = nz; }
        kasureLine(lastStamp, x, z, r, nx, nz, lastStamp.L + d * surf.k);
      }
      // 書いた分だけ墨が減る（かすれてくると紙に移る墨も減る）
      brushInk = Math.max(0, brushInk - INK_USE * r * d * (brushInk < KASURE_START ? 0.5 : 1));
      lastStamp = { x, z, r, nx, nz, L: lastStamp.L + d * surf.k, fresh: lastStamp.fresh && d <= 0.002 };   // L：この筆の運びで書いた長さ（px）
    }
    surf.dirty = true;
  }

  // ---------- three.js ----------
  const cv = $('cv');
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(css('--bg'));
  const camera = new THREE.PerspectiveCamera(CAM_FOV, 1, 0.1, 100);

  // 合計が1を超えると半紙が真っ白に飛び、薄いお手本が消えるので、上向きの面で1弱になるようにする
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7b6c, LIGHT_AMB));
  const sun = new THREE.DirectionalLight(0xffffff, LIGHT_SUN);
  sun.position.set(-2.5, 9, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 25 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  const desk = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({ color: css('--desk') }));
  desk.rotation.x = -Math.PI / 2;
  desk.position.y = -0.01;
  desk.receiveShadow = true;
  scene.add(desk);
  // 机に書いた墨：机のすぐ上に透明な面を重ねる（半紙の下に隠れる）
  const deskInkTex = new THREE.CanvasTexture(deskInkCv);
  const deskInk = new THREE.Mesh(new THREE.PlaneGeometry(DESK_INK_W, DESK_INK_D), new THREE.MeshLambertMaterial({ map: deskInkTex, transparent: true, depthWrite: false }));
  deskInk.rotation.x = -Math.PI / 2;
  deskInk.position.set(0, -0.006, DESK_INK_Z);
  deskInk.receiveShadow = true;
  scene.add(deskInk);

  const paperTex = new THREE.CanvasTexture(paperCv);
  paperTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(PAPER_W, PAPER_D), new THREE.MeshLambertMaterial({ map: paperTex }));
  paper.rotation.x = -Math.PI / 2;
  paper.receiveShadow = true;
  scene.add(paper);

  // 硯
  const box = (w, h, d, x, z, color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    m.position.set(x, h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  {
    const stone = css('--stone'), inD = STONE_D - RIM * 2;
    box(STONE_W, POOL_FLOOR, STONE_D, STONE_X, STONE_Z, stone);
    box(STONE_W, RIM_H, RIM, STONE_X, SZ0 + RIM / 2, stone);
    box(STONE_W, RIM_H, RIM, STONE_X, SZ1 - RIM / 2, stone);
    box(RIM, RIM_H, inD, SX0 + RIM / 2, STONE_Z, stone);
    box(RIM, RIM_H, inD, SX1 - RIM / 2, STONE_Z, stone);
    const landW = SX1 - RIM - POOL_X1;
    box(landW, LAND_H, inD, POOL_X1 + landW / 2, STONE_Z, stone);
    const poolW = POOL_X1 - SX0 - RIM;
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(poolW, inD), new THREE.MeshLambertMaterial({ color: css('--pool') }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(SX0 + RIM + poolW / 2, POOL_SURF, STONE_Z);
    pool.receiveShadow = true;
    scene.add(pool);
  }

  // タッチ：筆を下ろす位置の印（手や筆に隠れないよう最後に重ねて描く）
  const targetMark = new THREE.Mesh(
    new THREE.RingGeometry(TARGET_R * TARGET_IN, TARGET_R, GAUGE_SEG),
    new THREE.MeshBasicMaterial({ color: css('--target'), depthTest: false, transparent: true })
  );
  targetMark.rotation.x = -Math.PI / 2;
  targetMark.renderOrder = 10;
  targetMark.visible = false;
  scene.add(targetMark);
  // 長押しのゲージ：灰色の印の輪の上に、書き始めるまでの時間に合わせて赤い輪を12時から時計回りに重ねる
  const gaugeGeo = new THREE.RingGeometry(TARGET_R * TARGET_IN, TARGET_R, GAUGE_SEG, 1, Math.PI / 2, -Math.PI * 2);
  const gauge = new THREE.Mesh(gaugeGeo, new THREE.MeshBasicMaterial({ color: css('--gauge'), depthTest: false, transparent: true, side: THREE.DoubleSide }));
  gauge.rotation.x = -Math.PI / 2;
  gauge.renderOrder = 11;   // 灰色の印の上に描く
  gauge.visible = false;
  scene.add(gauge);

  // 2点の間に円柱を渡す
  const UP = V3(0, 1, 0);
  const _d = V3(0, 0, 0);
  function between(mesh, a, b, sx = 1){
    _d.subVectors(b, a);
    const len = _d.length() || 1e-4;
    mesh.position.addVectors(a, b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(UP, _d.divideScalar(len));
    mesh.scale.set(sx, len, sx);
  }
  const part = (geo, color) => {
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
    m.castShadow = true;
    scene.add(m);
    return m;
  };
  // ---------- 腕と手（円柱と球） ----------
  const skin = css('--skin');
  const upperArm = part(new THREE.CylinderGeometry(0.30, 0.34, 1, 20), skin);   // 上が肘側（少し細い）
  const foreArm = part(new THREE.CylinderGeometry(0.13, 0.18, 1, 20), skin);    // 上が手首側（細い）
  const shoulderBall = part(new THREE.SphereGeometry(0.34, 20, 14), skin);
  const elbowBall = part(new THREE.SphereGeometry(0.27, 20, 14), skin);
  const handBall = part(new THREE.SphereGeometry(HAND_BALL_R, 32, 24), skin);   // 手：握り位置を中心にした大きな球  // 筆：竹の軸、軸の尻、穂の付け根の口金、穂
  const handle = part(new THREE.CylinderGeometry(HANDLE_R, HANDLE_R, 1, 14), css('--bamboo'));
  const handleEnd = part(new THREE.CylinderGeometry(HANDLE_R * 1.05, HANDLE_R * 1.05, 1, 14), css('--ferrule'));
  const ferrule = part(new THREE.CylinderGeometry(0.06, 0.054, 1, 14), css('--ferrule'));
  // 穂は曲がるので、輪を並べた形を毎フレーム作り直す
  const brPos = new Float32Array((BR_SEG + 1) * BR_RAD * 3);
  const brIdx = [];
  for (let i = 0; i < BR_SEG; i++) for (let j = 0; j < BR_RAD; j++){
    const a = i * BR_RAD + j, b = i * BR_RAD + (j + 1) % BR_RAD;
    brIdx.push(a, a + BR_RAD, b, b, a + BR_RAD, b + BR_RAD);
  }
  const brGeo = new THREE.BufferGeometry();
  brGeo.setAttribute('position', new THREE.BufferAttribute(brPos, 3));
  brGeo.setIndex(brIdx);
  const bristle = new THREE.Mesh(brGeo, new THREE.MeshLambertMaterial({ color: css('--dry'), side: THREE.DoubleSide }));
  bristle.castShadow = true;
  bristle.frustumCulled = false;   // 形が毎フレーム変わり、範囲の計算が追いつかないため
  scene.add(bristle);
  const DRY = new THREE.Color(css('--dry')), WET = new THREE.Color(css('--bristle'));   // 乾いた穂・墨を含んだ穂の色

  // ---------- 手先ラグドール ----------
  const W = V3(0, 0, 0);            // 手首（プレイヤーが動かす点）
  const wV = V3(0, 0, 0);           // 手首の速さ
  const wT = V3(0, 0, 0);           // 手首の目標
  const S = V3(0, 0, 0), E = V3(0, 0, 0);   // 肩・肘（見た目用）
  const particle = () => ({ pos: V3(0, 0, 0), prev: V3(0, 0, 0) });
  const G = particle();             // 握り
  const F = particle();             // 穂の付け根
  const P = particle();             // 穂先
  let inkR = 0, inkX = 0, inkZ = 0;   // ならした墨の太さ・位置
  let contact = false;              // 穂先が床（紙・硯）に触れている
  let soaking = false;              // 穂を墨だまりに浸している

  // 筆がまっすぐ下がった状態で穂先がちょうど紙に触れる手首の高さ
  const TOUCH_Y = HANDLE_LOW + BRISTLE_LEN - HAND_DIR.y * HAND_LEN;

  const aim = V3(0, 0, 0);          // 穂先を置きたい紙の上の点
  const prevAim = V3(0, 0, 0);
  let aimSpeed = 0;
  let pressing = false;             // 指（マウス）を押している
  let arrived = false;              // 押したあと手首が目標に着いた（着いてから筆を下ろす）
  let pressAmt = 0;                 // いまの押し込み
  let still = 0.5;                  // 止まっている度合い（0〜1）

  function setWristTarget(){
    const down = pressing && arrived;
    wT.set(aim.x - HAND_DIR.x * HAND_LEN, TOUCH_Y + groundAt(aim.x, aim.z) + (down ? -pressAmt : LIFT), aim.z - HAND_DIR.z * HAND_LEN);
  }

  function resetBody(){
    setWristTarget();
    W.copy(wT); wV.set(0, 0, 0);
    G.pos.copy(W).addScaledVector(HAND_DIR, HAND_LEN);
    F.pos.copy(G.pos); F.pos.y -= HANDLE_LOW;
    P.pos.copy(F.pos); P.pos.y -= BRISTLE_LEN;
    for (const p of [G, F, P]) p.prev.copy(p.pos);
    contact = false;
    lastStamp = null;
  }

  const _t = V3(0, 0, 0), _v = V3(0, 0, 0), _dir = V3(0, 0, 0);
  // a を固定して b だけ動かし、距離を len にする
  function pinDist(a, b, len){
    _t.subVectors(b, a);
    const d = _t.length() || 1e-6;
    b.addScaledVector(_t, (len - d) / d);
  }
  // b を、a から axis の向きを中心に max（ラジアン）の円すいの中に収める（距離 len を保つ）
  const _cn = V3(0, 0, 0);
  function coneLimit(a, b, axis, len, max){
    _t.subVectors(b, a).normalize();
    const c = _t.dot(axis);
    if (c >= Math.cos(max)) return;
    _cn.copy(_t).addScaledVector(axis, -c);
    if (_cn.lengthSq() < 1e-8) _cn.set(1, 0, 0).addScaledVector(axis, -axis.x);
    _cn.normalize();
    b.copy(a).addScaledVector(axis, Math.cos(max) * len).addScaledVector(_cn, Math.sin(max) * len);
  }
  const DOWN = V3(0, -1, 0);
  // 両方を半分ずつ動かして距離を len にする
  function bothDist(a, b, len){
    _t.subVectors(b, a);
    const d = _t.length() || 1e-6;
    const k = (len - d) / d * 0.5;
    a.addScaledVector(_t, -k);
    b.addScaledVector(_t, k);
  }

  function physStep(){
    // 手首：目標をバネで追う（ここだけがプレイヤーの操作）
    wV.x += (FOLLOW_K * (wT.x - W.x) - FOLLOW_DAMP * wV.x) * STEP;
    wV.y += (FOLLOW_K * (wT.y - W.y) - FOLLOW_DAMP * wV.y) * STEP;
    wV.z += (FOLLOW_K * (wT.z - W.z) - FOLLOW_DAMP * wV.z) * STEP;
    W.addScaledVector(wV, STEP);

    // 手より先：慣性と重力で動く
    for (const p of [G, F, P]){
      _v.subVectors(p.pos, p.prev).multiplyScalar(AIR_DAMP);
      p.prev.copy(p.pos);
      p.pos.add(_v);
      p.pos.y -= GRAVITY * STEP * STEP;
    }
    // 力の抜けた手首・握りが元の形へゆるく戻ろうとする（ここが弱いほどぐらぐらする）
    _t.copy(W).addScaledVector(HAND_DIR, HAND_LEN);
    G.pos.lerp(_t, WRIST_STIFF);
    _t.copy(G.pos); _t.y -= HANDLE_LOW;
    F.pos.lerp(_t, GRIP_STIFF);
    // 穂は筆の軸の延長へ戻ろうとする
    _dir.subVectors(F.pos, G.pos).normalize();
    _t.copy(F.pos).addScaledVector(_dir, BRISTLE_LEN);
    P.pos.lerp(_t, contact ? BRISTLE_STRAIGHT_ON : BRISTLE_STRAIGHT);

    for (let i = 0; i < ITER; i++){
      pinDist(W, G.pos, HAND_LEN);
      coneLimit(W, G.pos, HAND_DIR, HAND_LEN, WRIST_LIMIT * Math.PI / 180);
      bothDist(G.pos, F.pos, HANDLE_LOW);
      coneLimit(G.pos, F.pos, DOWN, HANDLE_LOW, BRUSH_LIMIT * Math.PI / 180);
      // 穂は付け根から離れない（紙に押し付けると縮む）
      _t.subVectors(P.pos, F.pos);
      const d = _t.length();
      if (d > BRISTLE_LEN) P.pos.copy(F.pos).addScaledVector(_t, BRISTLE_LEN / d);
      const gF = groundAt(F.pos.x, F.pos.z) + FERRULE_MIN;
      if (F.pos.y < gF) F.pos.y = gF;
      const gG = groundAt(G.pos.x, G.pos.z) + FERRULE_MIN + 0.1;
      if (G.pos.y < gG) G.pos.y = gG;
      const gP = groundAt(P.pos.x, P.pos.z);
      if (P.pos.y < gP) P.pos.y = gP;
    }

    const onPaper = Math.abs(P.pos.x) <= PAPER_W / 2 && Math.abs(P.pos.z) <= PAPER_D / 2;
    contact = P.pos.y <= groundAt(P.pos.x, P.pos.z) + 1e-4;
    if (contact){
      // 紙との摩擦：穂先が引きずられて遅れてついてくる
      P.prev.x += (P.pos.x - P.prev.x) * PAPER_FRICTION;
      P.prev.z += (P.pos.z - P.prev.z) * PAPER_FRICTION;
      P.prev.y = P.pos.y;
    }
    const onDesk = !onPaper && groundAt(P.pos.x, P.pos.z) === 0 && Math.abs(P.pos.x) < DESK_INK_W / 2 && Math.abs(P.pos.z - DESK_INK_Z) < DESK_INK_D / 2;
    if (P.pos.y < INK_REACH && (onPaper || onDesk) && state === 'playing'){
      const s2 = onPaper ? paperSurf : deskSurf;
      if (surf !== s2){ surf = s2; lastStamp = null; }   // 半紙の端をまたいだら線を切る
      const depth = Math.max(0, BRISTLE_LEN - F.pos.y);   // 付け根が低いほど穂が紙に寝て太く書ける
      const lift = P.pos.y / INK_REACH;                    // 浮きかけているほど細く
      const r = INK_R_MIN + depth * INK_R_PER;
      // 筆の細かい弾みで線の輪郭ががたつかないよう、押し込みの太さと位置はならす。
      // 浮きかけたときの細りはならさずにすぐ効かせる（持ち上げたときに太いまま切れないように）
      if (!lastStamp){ inkR = r; inkX = P.pos.x; inkZ = P.pos.z; }
      else {
        inkR += (r - inkR) * (1 - Math.exp(-STEP / INK_R_SMOOTH));
        const k = 1 - Math.exp(-STEP / INK_POS_SMOOTH);
        inkX += (P.pos.x - inkX) * k;
        inkZ += (P.pos.z - inkZ) * k;
      }
      stampTo(inkX, inkZ, inkR * brushScale * (1 - lift * LIFT_THIN));
    } else {
      lastStamp = null;
    }
    // 墨だまりに穂を浸すと墨を含む（深く浸すほど速い）
    if (inPool(P.pos.x, P.pos.z) && P.pos.y < POOL_SURF){
      if (!soaking){ soaking = true; newKasure(); }
      brushInk = Math.min(1, brushInk + LOAD_RATE * STEP * (POOL_SURF - P.pos.y) / 0.1);
    } else {
      soaking = false;
    }
  }

  // 2本の骨のIK：A から T へ長さ la, lb の骨を伸ばし、関節を J、先端を tip に入れる（届かなければ T の方向へ伸びきる）
  const _n = V3(0, 0, 0), _pole = V3(0, 0, 0);
  function ik2(A, T, la, lb, pole, J, tip){
    _n.subVectors(T, A);
    let d = _n.length() || 1e-6;
    _n.divideScalar(d);
    d = Math.min(Math.max(d, Math.abs(la - lb) + 1e-3), (la + lb) * 0.999);
    tip.copy(A).addScaledVector(_n, d);
    const x = (la * la - lb * lb + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, la * la - x * x));
    _pole.copy(pole).addScaledVector(_n, -pole.dot(_n)).normalize();
    J.copy(A).addScaledVector(_n, x).addScaledVector(_pole, h);
  }

  // 肩と肘（見た目用）：手首が遠いと体ごと寄せ、肘は2本の骨のIKで出す
  const _armTip = V3(0, 0, 0);
  function solveArm(){
    _t.subVectors(SHOULDER_REST, W);
    const d0 = _t.length();
    S.copy(W).addScaledVector(_t.divideScalar(d0), Math.min(d0, (UPPER_LEN + FORE_LEN) * REACH_RATE));
    ik2(S, W, UPPER_LEN, FORE_LEN, ELBOW_POLE, E, _armTip);
  }

  const _bd = V3(0, 0, 0);   // 筆の軸の向き（穂先側）

  // 穂：付け根から軸の向きに出て穂先へ曲がる線に沿って、腹がふくらみ先がとがった形を作る
  const _c = V3(0, 0, 0), _bp = V3(0, 0, 0), _bt = V3(0, 0, 0), _bn = V3(0, 0, 0), _bb = V3(0, 0, 0);
  const AX_X = V3(1, 0, 0), AX_Z = V3(0, 0, 1);
  function updateBristle(){
    _c.copy(F.pos).addScaledVector(_bd, BRISTLE_LEN * 0.5);
    const gc = groundAt(_c.x, _c.z) + 0.015;
    if (_c.y < gc) _c.y = gc;                                         // 紙に押し付けると穂が寝て曲がる
    const spread = Math.max(0, BRISTLE_LEN - P.pos.distanceTo(F.pos)) / BRISTLE_LEN;   // 縮んだ分だけ腹が広がる
    for (let i = 0; i <= BR_SEG; i++){
      const t = i / BR_SEG, u = 1 - t;
      _bp.copy(F.pos).multiplyScalar(u * u).addScaledVector(_c, 2 * u * t).addScaledVector(P.pos, t * t);
      _bt.subVectors(_c, F.pos).multiplyScalar(2 * u).addScaledVector(_t.subVectors(P.pos, _c), 2 * t).normalize();
      _bn.crossVectors(_bt, Math.abs(_bt.x) < 0.9 ? AX_X : AX_Z).normalize();
      _bb.crossVectors(_bt, _bn);
      const r = Math.max(0.002, BR_R * brushScale * Math.pow(u, 0.7) * (1 + 1.2 * t) * (1 + spread * 2 * t));
      for (let j = 0; j < BR_RAD; j++){
        const a = j / BR_RAD * Math.PI * 2, ca = Math.cos(a) * r, sa = Math.sin(a) * r, k = (i * BR_RAD + j) * 3;
        brPos[k] = _bp.x + _bn.x * ca + _bb.x * sa;
        brPos[k + 1] = _bp.y + _bn.y * ca + _bb.y * sa;
        brPos[k + 2] = _bp.z + _bn.z * ca + _bb.z * sa;
      }
    }
    brGeo.attributes.position.needsUpdate = true;
    brGeo.computeVertexNormals();
  }

  const _top = V3(0, 0, 0), _fe = V3(0, 0, 0), _tp = V3(0, 0, 0);
  function updateMeshes(){
    targetMark.visible = touchMode && state === 'playing';
    targetMark.position.set(aim.x, groundAt(aim.x, aim.z) + 0.005, aim.z);
    // 書いている間は赤い輪のまま（指を離すと灰色に戻る）
    const holdRate = pressing ? 1 : Math.min(1, holdT / LONG_PRESS);
    gauge.visible = targetMark.visible && holding && (pressing || holdRate > GAUGE_SHOW);   // なぞっている最中のちらつきは出さない
    gauge.position.copy(targetMark.position);
    gaugeGeo.setDrawRange(0, Math.ceil(GAUGE_SEG * holdRate) * 6);   // 輪の1区切りは三角形2枚（6点）
    solveArm();
    between(upperArm, S, E);
    between(foreArm, E, G.pos);   // 手首は作らず、肘から手の球までまっすぐつなぐ
    shoulderBall.position.copy(S);
    elbowBall.position.copy(E);
    handBall.position.copy(G.pos);
    // 筆の軸：付け根から握りを通って上端まで
    _dir.subVectors(F.pos, G.pos).normalize();
    _top.copy(G.pos).addScaledVector(_dir, -HANDLE_HIGH);
    // 軸の両端は口金と尻の中へ少し入れ込み、端の面が重なってちらつかないようにする
    _fe.copy(F.pos).addScaledVector(_dir, -0.12);
    between(ferrule, F.pos, _fe);
    _fe.addScaledVector(_dir, 0.03);
    _tp.copy(_top).addScaledVector(_dir, 0.03);
    between(handle, _fe, _tp);
    _fe.copy(_top).addScaledVector(_dir, 0.06);
    between(handleEnd, _top, _fe);
    _bd.subVectors(F.pos, G.pos).normalize();
    updateBristle();
    bristle.material.color.copy(DRY).lerp(WET, Math.min(1, brushInk / KASURE_START));
  }

  // ---------- 画面サイズ・カメラ ----------
  const corners = [
    V3(-PAPER_W / 2, 0, PAPER_D / 2), V3(PAPER_W / 2, 0, PAPER_D / 2), V3(-PAPER_W / 2, 0, -PAPER_D / 2), V3(PAPER_W / 2, 0, -PAPER_D / 2),
    V3(SX0, RIM_H, SZ0), V3(SX1, RIM_H, SZ0)
  ];
  function placeCamera(dist){
    const el = CAM_ELEV * Math.PI / 180;
    camera.position.set(CAM_LOOK.x, CAM_LOOK.y + Math.sin(el) * dist, CAM_LOOK.z + Math.cos(el) * dist);
    camera.lookAt(CAM_LOOK);
    camera.updateMatrixWorld();
  }
  function resize(){
    const w = cv.clientWidth, h = cv.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // 下は決定ボタンの分を空け、その上の範囲に半紙と硯が収まる距離を探す（遠近があるので数回くり返して合わせる）
    camera.clearViewOffset();
    const top = FIT_Y, bottom = Math.min(0, -1 + 2 * BOTTOM_SPACE / h);
    const half = (top - bottom) / 2;
    let dist = 10, yMin = 0, yMax = 0;
    for (let i = 0; i < 5; i++){
      placeCamera(dist);
      let xExt = 0;
      yMin = Infinity; yMax = -Infinity;
      for (const c of corners){
        _t.copy(c).project(camera);
        xExt = Math.max(xExt, Math.abs(_t.x));
        yMin = Math.min(yMin, _t.y); yMax = Math.max(yMax, _t.y);
      }
      dist *= Math.max(xExt / FIT_X, (yMax - yMin) / 2 / half);
    }
    placeCamera(dist);
    // 映る範囲の真ん中が、空けた範囲の真ん中に来るよう画面をずらす
    const shift = ((top + bottom) / 2 - (yMin + yMax) / 2) * h / 2;
    camera.setViewOffset(w, h, 0, shift, w, h);
  }
  addEventListener('resize', resize);

  // ---------- 操作 ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const deskPlane = new THREE.Plane(V3(0, 1, 0), 0);
  let activeId = null;
  // タッチ：指を動かすと筆を下ろす位置（印）が動き、その場で長押しすると書き始める
  let touchMode = false;            // 最後の操作がタッチ
  let holding = false;              // 指を置いている（まだ書いていない）
  let holdX = 0, holdY = 0, holdT = 0;

  // 画面上の点が指す机の上の位置
  function deskHit(e, out){
    const r = cv.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(deskPlane, out);
  }
  function setAim(x, z){
    aim.set(
      THREE.MathUtils.clamp(x, -PAPER_W / 2 - MOVE_MARGIN, PAPER_W / 2 + MOVE_MARGIN), 0,
      THREE.MathUtils.clamp(z, SZ0 - 0.1, PAPER_D / 2 + MOVE_MARGIN)
    );
  }
  // マウス：指している所へ筆を動かす。タッチ：指を動かした分だけ筆を動かす（指で隠れず、触れた所へ飛ばない）
  const touchFrom = V3(0, 0, 0), aimFrom0 = V3(0, 0, 0), _hit = V3(0, 0, 0);
  function aimFrom(e){
    if (!deskHit(e, _hit)) return;
    if (e.pointerType === 'touch') setAim(aimFrom0.x + _hit.x - touchFrom.x, aimFrom0.z + _hit.z - touchFrom.z);
    else setAim(_hit.x, _hit.z);
  }

  cv.addEventListener('pointerdown', e => {
    if (state !== 'playing' || activeId !== null) return;
    e.preventDefault();
    activeId = e.pointerId;
    cv.setPointerCapture(e.pointerId);
    touchMode = e.pointerType === 'touch';
    if (touchMode){
      // 指を置いた所と今の筆の位置を覚え、ここからの指の動きの分だけ筆を動かす
      if (!deskHit(e, touchFrom)) touchFrom.copy(aim);
      aimFrom0.copy(aim);
    }
    aimFrom(e);
    if (touchMode){
      // タッチはすぐには書かず、指を止めて長押しするのを待つ
      holding = true;
      holdX = e.clientX; holdY = e.clientY; holdT = 0;
    } else {
      startWriting();
    }
  });
  function startWriting(){
    pressing = true;
    arrived = false;
    still = 0.5;
    pressAmt = PRESS_MIN + (PRESS_MAX - PRESS_MIN) * still;
  }
  cv.addEventListener('pointermove', e => {
    if (state !== 'playing') return;
    if (e.pointerType === 'mouse') touchMode = false;
    // マウスは押していなくても筆を動かせる（タッチは置いている指だけ）
    if (e.pointerId === activeId || (activeId === null && e.pointerType === 'mouse')) aimFrom(e);
    // 長押しを待っている間に指が動いたら、その場所から数え直す
    if (e.pointerId === activeId && holding && !pressing && Math.hypot(e.clientX - holdX, e.clientY - holdY) > LONG_PRESS_SLOP){
      holdX = e.clientX; holdY = e.clientY; holdT = 0;
    }
  });
  const release = e => {
    if (e.pointerId !== activeId) return;
    activeId = null;
    pressing = false;
    holding = false;
  };
  cv.addEventListener('pointerup', release);
  cv.addEventListener('pointercancel', release);

  // iPhone(Safari)で長押しや指の移動により文字選択・拡大鏡が出て操作が奪われるのを防ぐ
  const isPlayArea = t => t instanceof Element && !!t.closest('#cv');
  document.addEventListener('touchstart', e => { if (isPlayArea(e.target)) e.preventDefault(); }, { passive: false });
  document.addEventListener('touchmove', e => { if (activeId !== null) e.preventDefault(); }, { passive: false });
  document.addEventListener('selectstart', e => {
    if (!(e.target instanceof Element && e.target.closest('#share-text, input'))) e.preventDefault();
  });
  document.addEventListener('contextmenu', e => { if (isPlayArea(e.target)) e.preventDefault(); });
  // スマホでのダブルタップ拡大を防ぐ（拡大すると元に戻せなくなるため）
  let lastTouchEnd = 0;
  document.addEventListener('touchend', e => {
    if (e.target instanceof Element && e.target.closest('#share-text')) return;
    const now = Date.now();
    if (now - lastTouchEnd < 350) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  function updateAim(dt){
    if (holding && !pressing){
      holdT += dt;
      if (holdT >= LONG_PRESS) startWriting();
    }
    const sp = aim.distanceTo(prevAim) / Math.max(dt, 1e-4);
    prevAim.copy(aim);
    aimSpeed += (sp - aimSpeed) * Math.min(1, dt * 12);
    // 止めるほど深く押し込み（とめ）、速く動かすほど浅くなる（はらい）
    const target = THREE.MathUtils.clamp(1 - aimSpeed / SPEED_FULL, 0, 1);
    still += (target - still) * Math.min(1, dt * PRESS_RATE);
    pressAmt = PRESS_MIN + (PRESS_MAX - PRESS_MIN) * still;
    if (pressing && !arrived){
      // 手首が目標の真上に来るまでは筆を下ろさない（移動中に線が引かれないように）
      if (Math.hypot(W.x - (aim.x - HAND_DIR.x * HAND_LEN), W.z - (aim.z - HAND_DIR.z * HAND_LEN)) < ARRIVE_DIST) arrived = true;
    }
    setWristTarget();
  }

  // ---------- 採点 ----------
  function maskOf(src, gw, gh){
    const c = mkCanvas(gw, gh), g = c.getContext('2d');
    g.drawImage(src, 0, 0, gw, gh);
    const d = g.getImageData(0, 0, gw, gh).data, m = new Uint8Array(gw * gh);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 100 ? 1 : 0;
    return m;
  }
  function dilate(m, gw, gh, r){
    const o = new Uint8Array(m.length);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++){
      if (!m[y * gw + x]) continue;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++){
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < gw && yy < gh && dx * dx + dy * dy <= r * r) o[yy * gw + xx] = 1;
      }
    }
    return o;
  }
  // 形：はみ出さずに書けた割合と、お手本を書けた割合の調和平均（0〜1）
  function shapeRate(){
    const gw = Math.floor(TEX_W / GRID), gh = Math.floor(TEX_H / GRID);
    const ink = maskOf(inkCv, gw, gh), mdl = maskOf(modelCv, gw, gh);
    const inkD = dilate(ink, gw, gh, TOLERANCE), mdlD = dilate(mdl, gw, gh, TOLERANCE);
    let nInk = 0, inkIn = 0, nMdl = 0, mdlHit = 0;
    for (let i = 0; i < ink.length; i++){
      if (ink[i]){ nInk++; if (mdlD[i]) inkIn++; }
      if (mdl[i]){ nMdl++; if (inkD[i]) mdlHit++; }
    }
    if (!nInk || !nMdl) return 0;
    const p = inkIn / nInk, r = mdlHit / nMdl;
    return p + r > 0 ? 2 * p * r / (p + r) : 0;
  }

  // 画ごとの評価：お手本の線に沿って、横切る向きに墨の太さを測る
  let inkData = null;
  const inked = (x, y) => {
    const xi = Math.round(x), yi = Math.round(y);
    return xi >= 0 && yi >= 0 && xi < TEX_W && yi < TEX_H && inkData[(yi * TEX_W + xi) * 4 + 3] > 100;
  };
  // (x, y) を通り (nx, ny) の向きに並ぶ墨のうち、いちばん近い一続きの幅（px）。少しずれて書いていても拾う
  function inkWidth(x, y, nx, ny){
    const maxR = Math.round(MODEL_PX * 1.5);
    let best = 0, bestD = Infinity, run = 0, runStart = 0;
    for (let t = -maxR; t <= maxR + 1; t++){
      if (t <= maxR && inked(x + nx * t, y + ny * t)){ if (!run) runStart = t; run++; }
      else if (run){
        const d = Math.abs(runStart + run / 2);
        if (d < bestD){ bestD = d; best = run; }
        run = 0;
      }
    }
    return best;
  }
  const median = a => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
  // 1画を評価する。grade：0 ×、1 △、2 ○、3 ◎
  function evalStroke(path){
    const w = [], at = [];
    const none = path.st.e === 'none';
    for (let i = 0; i < EVAL_N; i++){
      const s = Math.min(path.len - 1, path.len * i / (EVAL_N - 1));
      const q = pointAt(path, s);
      at.push(s);
      w.push(inkWidth(q.x, q.y, -q.ty, q.tx));
    }
    const cover = w.filter(v => v > 0).length / EVAL_N;
    const wm = median(w.slice(Math.floor(EVAL_N * 0.3), Math.ceil(EVAL_N * 0.7)).filter(v => v > 0)) || median(w.filter(v => v > 0));
    const tail = w.slice(-3), tipW = Math.max(...tail);
    const end = pointAt(path, path.len);
    let grade = 0;
    if (path.st.e === 'tome'){
      // とめ：終わりまで太さを保って書き、先へはみ出していない
      if (tipW > 0){
        const full = tipW >= 0.75 * wm;
        const over = inkWidth(end.x + end.tx * MODEL_PX * 1.6, end.y + end.ty * MODEL_PX * 1.6, -end.ty, end.tx) > 0;
        // 止めずに細く抜けた：○、先へはみ出した：△
        grade = full && !over ? 3 : !over ? 2 : 1;
      }
    } else if (path.st.e === 'harai'){
      // はらい：終わりまで届き、先へ向かって細くなっている
      const lastQ = w.slice(Math.floor(EVAL_N * 0.75));
      if (lastQ.some(v => v > 0)){
        const reach = tipW > 0;
        const tip = tail.filter(v => v > 0).pop() || lastQ.filter(v => v > 0).pop();
        const thin = tip <= 0.5 * wm;
        // 細く抜けたが届いていない：○、先で止めて太いまま：△
        grade = reach && thin ? 3 : thin ? 2 : 1;
      }
    } else {
      // はね：はねの部分まで書き、先が細く抜けている
      const hk = w.filter((v, i) => at[i] >= path.hookFrom);
      const hc = hk.filter(v => v > 0).length / Math.max(1, hk.length);
      const corner = w[at.findIndex(v => v >= path.hookFrom)] || wm;
      if (hc > 0) grade = hc >= 0.75 && tipW > 0 && tipW <= 0.6 * corner ? 3 : hc >= 0.75 ? 2 : 1;
      else if (w.slice(-Math.max(2, hk.length) - 2, -hk.length).some(v => v > 0)) grade = 1;
    }
    return { type: path.st.e, grade: none ? -1 : grade, cover, x: end.x, y: end.y, cx: path.cx, cy: path.cy };
  }
  let strokeEvals = [];
  function judge(){
    inkData = inkCtx.getImageData(0, 0, TEX_W, TEX_H).data;
    const all = modelPaths.map(evalStroke);
    strokeEvals = all.filter(e => e.grade >= 0);   // 終わり方を評価する画（字の画像から推定した書き始めの枝は除く）
    if (!inkData.some((v, i) => i % 4 === 3 && v > 100)) return 0;
    const cover = all.length ? all.reduce((a, e) => a + e.cover, 0) / all.length : shapeRate();
    const tech = strokeEvals.length ? strokeEvals.reduce((a, e) => a + GRADE_PT[e.grade], 0) / strokeEvals.length : cover;
    return Math.round(100 * (W_SHAPE * shapeRate() + W_COVER * cover + W_TECH * tech));
  }

  // ---------- 進行 ----------
  // pick を渡すとその字にする（デバッグ用）。渡さなければ前と違う字をランダムに選ぶ
  function newRound(pick){
    let c = pick;
    if (!c) do { c = CHARS[Math.floor(Math.random() * CHARS.length)]; } while (c === char && CHARS.length > 1);
    char = c;
    updateDbgList();
    drawModel();
    inkCtx.clearRect(0, 0, TEX_W, TEX_H);
    inkCtx.fillStyle = css('--ink');
    deskSurf.ctx.clearRect(0, 0, deskInkCv.width, deskInkCv.height);
    deskSurf.ctx.fillStyle = css('--ink');
    deskSurf.dirty = true;
    paperDirty = true;
    state = 'playing';
    pressing = false; activeId = null; arrived = false; holding = false;
    brushInk = 0;   // 毎回乾いた筆から始める
    $('result').classList.add('hidden');
    $('done').classList.remove('hidden');
  }

  function finish(){
    if (state !== 'playing') return;
    state = 'over';
    pressing = false; activeId = null; holding = false;
    aim.copy(REST_AIM);
    score = judge();
    marks = markPlaces();
    rank = RANKS.find(r => score >= r[0])[1];
    judgeT = 0;
    $('score').textContent = `${rank} ${score}点`;
    $('done').classList.add('hidden');
    $('result-btns').classList.add('wait');
    $('result').classList.remove('hidden');
    $('again').focus({ preventScroll: true });
  }

  // ---------- 評価の演出 ----------
  let rank = '', judgeT = 0;
  const judgeCv = $('judge-cv'), judgeCtx = judgeCv.getContext('2d');
  const clamp01 = x => Math.min(1, Math.max(0, x));
  const easeOut = x => 1 - Math.pow(1 - x, 3);
  const phase = (t, [a, b]) => clamp01((t - a) / (b - a));
  // 評価を書く位置：画の終わりから字の外側へ離し、ほかの評価と重ならないようにずらす（テクスチャの座標）
  function markPlaces(){
    const placed = [], step = MARK_OUT * CELL;
    return strokeEvals.map(e => {
      let dx = e.x - e.cx, dy = e.y - e.cy;   // その字の中心から外側へ
      const l = Math.hypot(dx, dy) || 1;
      dx /= l; dy /= l;
      let x = e.x + dx * step, y = e.y + dy * step;
      // ほかの評価や墨に重なるなら、さらに外へずらす
      const nearInk = () => [-0.4, 0, 0.4].some(ox => [-0.5, -0.2, 0.1, 0.4].some(oy => inked(x + ox * step, y + oy * step)));
      const blocked = () => placed.some(p => Math.hypot(p.x - x, p.y - y) < step * 1.1) || nearInk();
      for (let k = 0; k < 8 && blocked(); k++){ x += dx * step * 0.5; y += dy * step * 0.5; }
      x = Math.min(TEX_W - step * 0.6, Math.max(step * 0.6, x));
      y = Math.min(TEX_H - step * 0.8, Math.max(step * 0.6, y));
      placed.push({ x, y });
      return { x, y };
    });
  }
  let marks = [];
  // 評価を1つずつ出す間隔：画が多い（字が複数）ときは、出し切るまでが MARKS_MAX 秒に収まるよう詰める
  const markGap = () => Math.min(JUDGE.markGap, MARKS_MAX / Math.max(1, strokeEvals.length));
  const timeline = () => {
    const stamp = JUDGE.marks + strokeEvals.length * markGap() + JUDGE.stampAfter;
    const count = stamp + JUDGE.stampIn + JUDGE.countAfter;
    return { stamp, count: [count, count + JUDGE.count], end: count + JUDGE.count + JUDGE.endAfter };
  };
  // 朱印：賞の名前を白抜きで縦に書いた四角い印
  function shuStamp(g, x, y, size){
    g.save();
    g.translate(x, y);
    g.rotate(-0.12);
    g.fillStyle = css('--shu');
    g.fillRect(-size / 2, -size / 2, size, size);
    g.strokeStyle = css('--paper');
    g.lineWidth = size * 0.04;
    g.strokeRect(-size * 0.4, -size * 0.4, size * 0.8, size * 0.8);
    g.fillStyle = css('--paper');
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const chars = [...rank], fs = size * (chars.length > 2 ? 0.25 : 0.33);
    g.font = `700 ${fs}px ${MODEL_FONT}`;
    chars.forEach((c, i) => g.fillText(c, 0, (i - (chars.length - 1) / 2) * fs * 1.05));
    g.restore();
  }
  // 時刻 t の評価画面を描く（半紙は画面いっぱい、下に点数）
  function drawJudge(g, W, H, t){
    g.fillStyle = css('--bg');
    g.fillRect(0, 0, W, H);
    const scoreH = Math.min(90, H * 0.14);
    const sc = Math.min(W / TEX_W, (H - scoreH) / TEX_H);
    const pw = TEX_W * sc, ph = TEX_H * sc, px = (W - pw) / 2, py = (H - scoreH - ph) / 2;   // 半紙と点数をひとまとまりで上下中央に
    const cx = px + pw / 2, cy = py + ph / 2;
    // 半紙が少し大きくなりながら現れる
    const a = easeOut(clamp01(t / JUDGE.paperIn));
    g.save();
    g.globalAlpha = a;
    g.translate(cx, cy);
    g.scale(0.9 + 0.1 * a, 0.9 + 0.1 * a);
    g.translate(-cx, -cy);
    g.drawImage(paperBaseCv, px, py, pw, ph);
    g.drawImage(inkCv, px, py, pw, ph);
    g.restore();
    // 画の終わりごとに、朱で ◎○△× と「とめ」「はね」「はらい」を書く（書き順に1つずつ）
    const tl = timeline(), sc2 = pw / TEX_W, fs = CELL * sc2 * 0.09;
    g.fillStyle = css('--shu');
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    strokeEvals.forEach((e, i) => {
      const k = clamp01((t - JUDGE.marks - i * markGap()) / JUDGE.markIn);
      if (k <= 0) return;
      const m = marks[i], x = px + m.x * sc2, y = py + m.y * sc2, z = 1 + 0.6 * (1 - easeOut(k));
      g.save();
      g.globalAlpha = k;
      g.translate(x, y);
      g.scale(z, z);
      g.font = `700 ${fs}px ${MODEL_FONT}`;
      g.fillText(GRADE_MARK[e.grade], 0, -fs * 0.3);
      g.font = `700 ${fs * 0.5}px ${MODEL_FONT}`;
      g.fillText(END_NAME[e.type], 0, fs * 0.5);
      g.restore();
    });
    // 印：大きいところから押し付けるように現れる
    if (t >= tl.stamp){
      const k = clamp01((t - tl.stamp) / JUDGE.stampIn);
      g.save();
      g.globalAlpha = k;
      // 1文字は右上、複数の字は字に重ならないよう左下の隅へ小さめに押す（作品の落款の位置）
      const multi = [...char].length > 1, base = multi ? STAMP_MULTI : STAMP_ONE;
      const size = pw * base * (1 + 0.7 * (1 - easeOut(k)));
      if (multi) shuStamp(g, px + pw * 0.1, py + ph - pw * 0.1, size);
      else shuStamp(g, px + pw * 0.83, py + pw * 0.17, size);
      g.restore();
    }
    // 点数を数え上げる
    if (t >= tl.count[0]){
      const n = Math.round(score * easeOut(phase(t, tl.count)));
      g.fillStyle = css('--fg');
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `700 ${scoreH * 0.62}px ${MODEL_FONT}`;
      g.fillText(`${n}点`, W / 2, py + ph + scoreH / 2);
    }
  }
  function updateJudge(dt){
    judgeT += dt;
    if (judgeT >= timeline().end) $('result-btns').classList.remove('wait');
    // キャンバスの大きさを画面に合わせる
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = judgeCv.clientWidth, h = judgeCv.clientHeight;
    if (judgeCv.width !== Math.round(w * dpr) || judgeCv.height !== Math.round(h * dpr)){
      judgeCv.width = Math.round(w * dpr);
      judgeCv.height = Math.round(h * dpr);
    }
    judgeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawJudge(judgeCtx, w, h, judgeT);
  }

  $('done').addEventListener('click', finish);

  // ---------- デバッグ：出題一覧 ----------
  CHARS.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = c;
    b.dataset.char = c;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => { newRound(c); toggleDbg(false); });
    $('dbg-list').insertBefore(b, $('custom-row'));
  });
  function updateDbgList(){
    for (const b of $('dbg-list').querySelectorAll('button[data-char]')) b.setAttribute('aria-pressed', String(b.dataset.char === char));
  }
  // 好きな字（4文字まで）：入力した字の筆順データを読み込み（無ければ推定）、その字で始める
  let analyzing = false;
  async function startCustom(){
    const c = [...$('custom-char').value.replace(/\s/g, '')].slice(0, MAX_CHARS).join('');
    if (!c || analyzing) return;
    analyzing = true;
    $('custom-go').disabled = true;
    $('custom-go').textContent = '読込中';
    for (const g of new Set(c)){
      if (STROKES[g] || kvgCache.has(g)) continue;
      const data = await loadKanjiVG(g);
      if (data) kvgCache.set(g, data);
    }
    analyzing = false;
    $('custom-go').disabled = false;
    $('custom-go').textContent = '決定';
    $('custom-char').value = '';
    $('custom-char').blur();
    newRound(c);
    toggleDbg(false);
  }
  $('custom-go').addEventListener('click', startCustom);
  $('custom-char').addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); startCustom(); } });
  function toggleDbg(open){
    $('dbg-list').classList.toggle('hidden', !open);
    $('dbg').setAttribute('aria-expanded', String(open));
  }
  $('dbg').addEventListener('click', () => toggleDbg($('dbg-list').classList.contains('hidden')));
  $('again').addEventListener('click', () => { newRound(char); aim.copy(START_AIM); });   // もう一回は同じ字で
  document.addEventListener('keydown', e => {
    if (!$('share-view').classList.contains('hidden')) return;
    if (state === 'over' && (e.key === ' ' || e.key === 'Enter') && document.activeElement !== $('share')){
      e.preventDefault();
      $('again').click();
    }
  });

  // ---------- 共有 ----------
  function shareText(){
    const url = new URL('./', location.href).href;
    return `「${char}」${rank} ${score}点\n${url}\n${HASHTAG}`;
  }
  // 共有する画像：評価の演出が終わった時の画面と同じもの
  function resultCanvas(){
    const W0 = 600, H0 = Math.round(W0 * TEX_H / TEX_W) + 100, c = mkCanvas(W0, H0);
    drawJudge(c.getContext('2d'), W0, H0, timeline().end);
    return c;
  }
  function resultImageFile(c){
    const bin = atob(c.toDataURL('image/png').split(',')[1]);   // toBlob の非同期コールバックは避ける
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return new File([buf], 'result.png', { type: 'image/png' });
  }
  $('share').addEventListener('pointerdown', e => e.stopPropagation());
  $('share').addEventListener('click', () => {
    const text = shareText();
    const c = resultCanvas();
    const file = resultImageFile(c);
    // 3) 共有シートが無い・使えない環境：文面をコピーし、共有される内容を画面に出す
    const fallback = () => {
      navigator.clipboard?.writeText(text).catch(() => {});
      $('share-img').src = c.toDataURL('image/png');
      $('share-text').textContent = text;
      $('share-view').classList.remove('hidden');
      $('share-close').focus({ preventScroll: true });
    };
    // 失敗、または押してすぐのキャンセル扱いは共有シートが出なかったとみなして 3) へ
    const shareStart = performance.now();
    const failed = err => {
      const instant = performance.now() - shareStart < SHARE_INSTANT * 1000;
      if (!err || err.name !== 'AbortError' || instant) fallback();
    };
    // 1) 画像を渡せる共有シート：文面＋結果画像
    if (navigator.canShare && navigator.canShare({ files: [file] })){
      navigator.share({ text, files: [file] }).catch(failed);
      return;
    }
    // 2) 画像を渡せない共有シート：文面のみ
    if (navigator.share){
      navigator.share({ text }).catch(failed);
      return;
    }
    fallback();
  });
  const closeShareView = () => {
    $('share-view').classList.add('hidden');
    $('share').focus({ preventScroll: true });
  };
  $('share-close').addEventListener('click', closeShareView);
  $('share-view').addEventListener('pointerdown', e => e.stopPropagation());
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('share-view').classList.contains('hidden')) closeShareView();
  });

  // ---------- ループ ----------
  let acc = 0;
  function update(dt){
    updateAim(dt);
    acc += dt;
    while (acc >= STEP){ physStep(); acc -= STEP; }
    if (paperSurf.dirty){ paperDirty = true; paperSurf.dirty = false; }
    if (paperDirty){ composePaper(); paperDirty = false; }
    if (deskSurf.dirty){ deskInkTex.needsUpdate = true; deskSurf.dirty = false; }
    updateMeshes();
    if (state === 'over') updateJudge(dt);
  }

  resize();
  makePaperBase();
  newRound();
  START_AIM.set((SX0 + RIM + POOL_X1) / 2, 0, STONE_Z);
  aim.copy(START_AIM);
  prevAim.copy(aim);
  resetBody();

  let last = performance.now();
  function loop(now){
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
