/** Direct extract of the source paper-doll fight (source/demo.html). */
import * as THREE from 'three';

const palette = {
  '--bg':'#e8eef1','--paper':'#fbfcfd','--ink':'#1f2a44','--floor':'#cdd8df',
  '--spark':'#ffd400','--flash':'#ff4a3d','--trail':'#ffffff',
};
function css(name){ return palette[name]; }

export function createSourceFight(canvas, layer){
  let renderer = null, scene = null, camera = null, fx = null;
  let state = 'draw', introT = 0, player = null, enemy = null;
  let acc = 0, endT = 0, hitStop = 0, slowT = 0, shake = 0;
  const keys = {};
  let jx = 0, jy = 0, defHeld = false;

  const CHAR_H = 2.0;       // キャラの高さ（3D空間の単位）
  const SEG_LEN = 9;        // ボーン1本の長さの目安（解析ピクセル）
  const SPUR = 5;           // これより短い枝はボーンにしない（細線化で出るヒゲを除く）
  const RAY_N = 6;          // 骨格からボーンがほとんど取れない形（丸など）に、中心から放射状に足すボーンの本数
  const MIN_JOINTS = 3;     // 関節がこれより少ないときに放射状のボーンを足す
  const RAY_COVER = 1.0;    // 骨格の長さが「形の大きさ（面積の平方根）×この値」より短いときも放射状のボーンを足す
  const MAX_JOINTS = 48;    // 関節数の目安の上限（超えそうならボーンを長くする）
  const GRID_N = 96;        // 変形メッシュの細かさ（長辺方向の分割数。輪郭のなめらかさに効く）
  const BLEND = 0.5;        // 関節まわりで親ボーンと混ぜる範囲（ボーン長に対する比）
  const Z_LAYER = 0.004;    // 重なり順：根元から1段離れるごとに手前へずらす量（同じ面で重なるとちらつくため）
  const Z_SUB = 0.0005;     // 重なり順：同じ段のボーンどうしをずらす量

  const INFLATE = 3.5;      // 絵のふくらみ（太い所ほど厚くなる。0で紙のように平ら）
  const THICK_MAX = 0.45;   // ふくらみの厚さの上限（片側）
  const THICK_SMOOTH = 12;  // ふくらみをなめらかにする回数（多いほど縁のギザギザが消えて丸くなる）
  const TURN_SPEED = 8;     // 相手のほうへ向き直る速さ（ラジアン/秒）
  const CAM_ANGLE = 0.8;    // カメラ：自分の真後ろから右へ回り込む角度（ラジアン。自分で相手が隠れないように斜め後ろから見る）
  const CAM_DIST = 4.4;     // カメラ：2人の中間からの距離（相手との距離に応じて足す）
  const CAM_H = 1.5;        // カメラ：高さ（距離に応じて足す）
  const ARENA_R = 4.2;      // 土俵の半径
  const FLOOR_CELL = 0.5;   // 土俵の方眼の1マスの大きさ
  const FLOOR_LINE_A = 0.09;// 土俵の方眼の線の濃さ（0〜1。小さいほどうっすら）
  const FLOOR_TEX = 1024;   // 土俵の模様の画像の大きさ（ピクセル）
  const MOVE_SPEED = 3.0;   // 移動の速さ
  const GRAVITY = 5;        // 関節にかかる重力
  const DAMP = 0.94;        // 関節の揺れの減衰（小さいほどすぐ止まる）
  const STIFF_ROOT = 0.22;  // 体の中心付近が元の形に戻ろうとする強さ
  const STIFF_TIP = 0.05;   // 手足の先が元の形に戻ろうとする強さ
  const ITER = 4;           // ボーンの長さを保つ計算の反復回数
  const STEP = 1 / 120;     // 物理の固定タイムステップ

  const LEG_FREQ = 5;       // 移動中に足をダバダバさせる速さ（1秒あたりの往復回数）
  const LEG_SWING = 0.9;    // 足を前後に振る角度（ラジアン）
  const LEG_STIFF = 0.35;   // 足を振る動きに引っぱる強さ
  const LEG_LOW = 0.3;      // 先端がキャラの高さ×この値より下にある手足を「足」とみなす
  const ATK_WIND = 0.09;    // 攻撃の振りかぶり時間（秒）
  const ATK_STRIKE = 0.2;   // 攻撃で手足を伸ばしている時間（秒）
  const ATK_COOL = 0.12;    // 攻撃後に次の攻撃ができるまで（秒）
  const ATK_STIFF = 0.25;   // 攻撃中に手足を狙いへ引っぱる強さ
  const LUNGE = 1.6;        // 攻撃時の踏み込みの速さ（手足が無い絵は体当たりで2.5倍）
  const HIT_PAD = 0.12;     // 当たり判定の余白
  const DMG_MIN = 5;        // ダメージの最小
  const DMG_MAX = 16;       // ダメージの最大
  const SPEED_FULL = 25;    // 先端がこの速さ以上で当たると最大ダメージ
  const KNOCKBACK = 3.5;    // 当たったときに吹っ飛ぶ速さ
  const KB_FRICTION = 5;    // 吹っ飛びの減速
  const HIT_SHAKE = 0.05;   // 当たったときに体がたわむ強さ
  const STUN = 0.3;         // 当たったあと動けない時間（秒）
  const DMG_RAND = 0.3;     // ダメージのばらつき（±30%）
  const END_WAIT = 1.5;     // 決着してから結果を出すまで（秒。倒れるところを見せる）

  const STAT = {            // 対戦ごとにランダムで決まる能力の幅（最小, 最大）
    power: [0.7, 1.3],      // 力（ダメージの倍率）
    speed: [0.7, 1.3],      // 速さ（移動の速さの倍率）
    hp:    [70, 130],       // 体力
    def:   [0.7, 1.3],      // 守り（受けるダメージの倍率は 2−守り。防いだときのスタミナの減りは 1÷守り 倍）
  };

  // ---------- 防御 ----------
  // 防御中に当たった攻撃は体力が減らない。代わりにスタミナが減る
  const GUARD_SPEED = 0.4;      // 防御中の移動の速さ（倍率）
  const GUARD_KB = 0.3;         // 防御中に当たったときの吹っ飛び（倍率）
  const GUARD_STUN = 0.08;      // 防御中に当たったときに動けない時間（秒）
  // スタミナ（ダクソ風）：攻撃すると減り、防いだ攻撃でも減る。使ってから少し待つと回復が始まる
  const STAM_MAX = 100;         // スタミナの最大
  const STAM_ATK = 28;          // 攻撃1回で使うスタミナ（少しでも残っていれば攻撃でき、足りない分は0で止まる）
  const STAM_GUARD = 2.0;       // 防いだ攻撃で減るスタミナ（ダメージ × この値 ÷ 守り）
  const STAM_REGEN = 45;        // 回復の速さ（1秒あたり）
  const STAM_REGEN_GUARD = 0.15;// 防御を構えている間の回復の速さ（倍率。構えっぱなしだと少しずつ削られる）
  const STAM_DELAY = 0.6;       // 使ってから回復が始まるまで（秒）
  const GUARD_BREAK_STUN = 0.9; // スタミナが尽きてガードが崩れたときに無防備になる時間（秒）
  const GUARD_FWD = 0.35;       // 防御の構え：腕などを体の前へ出す距離

  // ---------- 演出 ----------
  const HITSTOP_BASE = 0.035;   // ヒットストップ（当たった瞬間に止まる時間、秒）
  const HITSTOP_PER_DMG = 0.004;// ダメージ1あたりの追加ヒットストップ（秒）
  const SHAKE_PER_DMG = 0.012;  // カメラの揺れ幅（ダメージ1あたり）
  const SHAKE_DECAY = 9;        // カメラの揺れの収まる速さ
  const SPARK_N = 12;           // 1回の当たりで飛ぶ火花の数
  const SPARK_SPEED = 5;        // 火花の速さ
  const SPARK_LIFE = 0.28;      // 火花が消えるまで（秒）
  const SPARK_W = 0.035;        // 火花の太さ
  const RING_LIFE = 0.22;       // 衝撃の輪が広がって消えるまで（秒）
  const RING_SIZE = 0.7;        // 衝撃の輪の最大の大きさ
  const FLASH_TIME = 0.2;       // 被弾したキャラが赤く光る時間（秒）
  const POP_LIFE = 0.75;        // ダメージ数字が消えるまで（秒）
  const BIG_HIT = 14;           // このダメージ以上は数字を大きく出す
  const TRAIL_LEN = 10;         // 攻撃の軌跡の長さ（フレーム数）
  const TRAIL_W = 0.07;         // 攻撃の軌跡の太さ
  const SHARE_FILL = 0.85;      // 共有画像でキャラが画面の狭い方の幅に占める割合（大きいほど寄る）
  // 登場：描いた絵（ぺらぺらの2D）がボンッと煙に包まれて3Dになる
  const INTRO_HOLD = 0.7;       // 2Dの絵のまま見せる時間（秒）
  const INTRO_SWAP = 0.1;       // 煙が出てから3Dに切り替わるまで（秒。煙で隠れた瞬間に替える）
  const INTRO_END = 0.65;       // 煙が出てから戦い開始まで（秒）
  const PUFF_N = 16;            // 1人あたりの煙の玉の数
  const PUFF_SIZE = 0.6;        // 煙の玉の大きさ
  const PUFF_GROW = 0.1;        // 煙の玉がふくらみきるまで（秒）
  const PUFF_LIFE = 0.6;        // 煙の玉が消えるまで（秒）
  const PUFF_SPEED = 1.6;       // 煙の玉が外へ広がる速さ
  const POPIN_TIME = 0.35;      // 3Dになったときに少し大きくなって戻る時間（秒）
  // ガードが崩れたとき：紙の破片が飛び散り、崩れている間は頭の上を星が回る
  const SHARD_N = 12;           // 破片の数
  const SHARD_SIZE = 0.3;       // 破片の大きさ
  const SHARD_SPEED = 3.2;      // 破片の飛ぶ速さ
  const SHARD_LIFE = 0.7;       // 破片が消えるまで（秒）
  const BREAK_SHAKE = 0.18;     // 崩れたときのカメラの揺れ
  const BREAK_HITSTOP = 0.12;   // 崩れたときのヒットストップ（秒）
  const DIZZY_N = 3;            // 頭の上を回る星の数
  const DIZZY_R = 0.32;         // 星が回る半径
  const DIZZY_SPEED = 6;        // 星が回る速さ（ラジアン/秒）
  const DIZZY_SIZE = 0.2;       // 星の大きさ
  const POPIN_SCALE = 0.15;     // そのときの大きくなる割合
  const INTRO_SHAKE = 0.08;     // ボンッのときのカメラの揺れ
  const FALL_KICK = 2.5;        // やられたとき：倒れ始めの回る速さ（ラジアン/秒）
  const FALL_ACCEL = 14;        // やられたとき：倒れる加速（大きいほど勢いよく倒れる）
  const FALL_MAX = 1.45;        // やられたとき：倒れる角度（ラジアン。約83°で仰向け）
  const FALL_BOUNCE = 0.3;      // 地面に着いたときの跳ね返り
  const DOWN_STIFF = 0.3;       // 倒れたあと元の形に戻ろうとする強さ（倍率。小さいほどぐったりする）
  const DOWN_GRAVITY = 30;      // 倒れたあと手足にかかる重力（地面に垂れるように）
  const KO_SLOW = 0.25;         // 決着の一撃のスローの速さ（倍率）
  const KO_SLOW_TIME = 0.8;     // 決着の一撃のスローの長さ（実時間・秒）
  const KO_SHAKE = 0.25;        // 決着の一撃の追加の揺れ

  // CPUの戦い方（対戦ごとにランダムで1つ選ぶ）
  //  speed    移動の速さ（プレイヤーに対する倍率）
  //  waitMin/waitMax  攻撃の間隔（秒）
  //  guard    相手の攻撃を防御する確率 / react 防御するまでの時間（秒）
  //  dist     立つ距離（届く距離に対する倍率。大きいほど遠くから）
  //  strafe   相手の周りを回り込む強さ（0で回らない）
  //  retreat  攻撃したあと離れている時間（秒。0で離れない）
  //  counter  防御で受け止めたら、すぐ反撃する
  const CPU_TYPES = [
    { name:'ふつう',     speed:0.6,  waitMin:0.5,  waitMax:1.3, guard:0.45, react:0.12, dist:0.6,  strafe:0,   retreat:0,   counter:false, stam:0.35 },
    { name:'せっかち',   speed:0.85, waitMin:0.25, waitMax:0.6, guard:0.12, react:0.2,  dist:0.45, strafe:0,   retreat:0,   counter:false, stam:0.01 },
    { name:'ガード上手', speed:0.5,  waitMin:0.9,  waitMax:1.8, guard:0.85, react:0.06, dist:0.7,  strafe:0,   retreat:0,   counter:true,  stam:0.55 },
    { name:'逃げ足',     speed:0.8,  waitMin:0.4,  waitMax:0.9, guard:0.35, react:0.12, dist:0.6,  strafe:0,   retreat:1.1, counter:false, stam:0.3 },
    { name:'回り込み',   speed:0.75, waitMin:0.5,  waitMax:1.1, guard:0.4,  react:0.12, dist:0.65, strafe:0.9, retreat:0,   counter:false, stam:0.3 },
  ];
  const RETREAT_DIST = 1.6;   // 逃げ足：攻撃したあと下がる距離
  const TIRED_DIST = 0.6;     // スタミナが足りない間は、これだけ離れて回復を待つ

  function displayTexture(tex){
    const W = tex.width, c = document.createElement('canvas'); c.width = c.height = W;
    const g = c.getContext('2d');
    g.drawImage(tex, 0, 0);
    // 斜着看、再一转动，各向异性过滤会采到轮廓外的黑底，边缘就发脏、发锯齿。
    // 把画好的颜色整圈外扩，mip 和斜向采样都还落在墨色上。
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = W;
    const tg = tmp.getContext('2d');
    const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const step of [16, 8, 4, 2, 1]){
      tg.clearRect(0, 0, W, W);
      for (const [dx, dy] of offsets) tg.drawImage(c, dx * step, dy * step);
      tg.drawImage(c, 0, 0);
      g.clearRect(0, 0, W, W);
      g.drawImage(tmp, 0, 0);
    }
    const img = g.getImageData(0, 0, W, W), d = img.data;
    for (let i = 3; i < d.length; i += 4) d[i] = 255;
    g.putImageData(img, 0, 0);
    tmp.width = tmp.height = 0;
    return c;
  }


  function floorTexture(){
    const c = document.createElement('canvas'); c.width = c.height = FLOOR_TEX;
    const g = c.getContext('2d');
    g.fillStyle = css('--floor'); g.fillRect(0, 0, FLOOR_TEX, FLOOR_TEX);
    g.strokeStyle = css('--ink'); g.globalAlpha = FLOOR_LINE_A; g.lineWidth = FLOOR_TEX / 400;
    const n = Math.round(ARENA_R * 2 / FLOOR_CELL), step = FLOOR_TEX / n;
    g.beginPath();
    for (let i = 1; i < n; i++){ const v = i * step; g.moveTo(v, 0); g.lineTo(v, FLOOR_TEX); g.moveTo(0, v); g.lineTo(FLOOR_TEX, v); }
    g.stroke();
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();   // 斜めに見たときの線のちらつきを抑える
    return t;
  }
  function initThree(){
    renderer = new THREE.WebGLRenderer({ canvas:canvas, antialias:true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    scene = new THREE.Scene();
    scene.background = new THREE.Color(css('--bg'));
    camera = new THREE.PerspectiveCamera(60, 1, 0.5, 100);   // near を離して奥行きの精度を上げる
    const floor = new THREE.Mesh(new THREE.CircleGeometry(ARENA_R, 64), new THREE.MeshBasicMaterial({ map:floorTexture() }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    // 土俵の縁（奥行きと場外の位置が分かるように）
    const edge = new THREE.Mesh(new THREE.RingGeometry(ARENA_R - 0.06, ARENA_R, 96), new THREE.MeshBasicMaterial({ color:css('--ink') }));
    edge.rotation.x = -Math.PI / 2; edge.position.y = 0.005;
    scene.add(edge);
    // ふくらみに陰影を付けるための光（真上からの環境光＋斜め上からの光）
    scene.add(new THREE.HemisphereLight(0xffffff, new THREE.Color(css('--floor')), 0.85));
    const sun = new THREE.DirectionalLight(0xffffff, 0.45);
    sun.position.set(2, 5, 3);
    scene.add(sun);
  }
  function resize3(){
    const c = canvas, w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  function makeFighter(data, layer){
    const J = data.joints, n = J.length;
    const f = {
      n, par:new Int16Array(n), ox:new Float32Array(n), oy:new Float32Array(n), restY0:J[0].y,
      rad:new Float32Array(n), len:new Float32Array(n), stiff:new Float32Array(n),
      pos:new Float32Array(n * 3), prev:new Float32Array(n * 3), frame:new Float32Array(n * 12),
      atkMark:new Uint8Array(n), allIdx:[...Array(n).keys()],
    };
    const depth = new Int16Array(n), nk = new Int16Array(n), kidsOf = [...Array(n)].map(() => []);
    let maxD = 1;
    for (let j = 0; j < n; j++){
      f.par[j] = J[j].par;
      f.ox[j] = J[j].x - J[0].x; f.oy[j] = J[j].y - J[0].y;
      f.rad[j] = J[j].rad;
      if (j > 0){
        const p = J[j].par;
        f.len[j] = Math.hypot(J[j].x - J[p].x, J[j].y - J[p].y);
        depth[j] = depth[p] + 1; if (depth[j] > maxD) maxD = depth[j];
        nk[p]++; kidsOf[p].push(j);
      }
    }
    for (let j = 1; j < n; j++) f.stiff[j] = STIFF_ROOT + (STIFF_TIP - STIFF_ROOT) * (depth[j] / maxD);
    // 同じ絵の中で部位が重なったときのちらつき防止：ボーンごとに厚さを少しずつ足す（手足ほど外側）
    f.zoff = new Float32Array(n);
    for (let j = 1; j < n; j++) f.zoff[j] = depth[j] * Z_LAYER + j * Z_SUB;

    // 攻撃に使う手足（先端から分かれ道までの関節の並び）
    f.chains = [];
    for (let j = 1; j < n; j++){
      if (nk[j] !== 0) continue;
      // 先端から根元へ、分かれ道までたどる
      const joints = [j];
      let p = f.par[j];
      while (p > 0 && nk[p] === 1){ joints.unshift(p); p = f.par[p]; }
      const cum = []; let sum = 0;
      for (const k of joints){ sum += f.len[k]; cum.push(sum); }
      f.chains.push({ pivot:p, joints, cum, dirX:(J[j].x - J[p].x) / (sum || 1), reach:sum + Math.abs(f.ox[p]) });
    }
    f.reach = f.chains.length ? Math.max(...f.chains.map(c => c.reach)) : 0;
    // 足：先端が根元より下で、地面の近くにある手足。左右の位置で並べ、交互に逆向きに振る
    const tipY = c => J[c.joints[c.joints.length - 1]].y;
    let legs = f.chains.filter(c => tipY(c) < J[0].y && tipY(c) < CHAR_H * LEG_LOW);
    if (!legs.length) legs = f.chains.filter(c => tipY(c) < J[0].y).sort((a, b) => tipY(a) - tipY(b)).slice(0, 2);
    legs.sort((a, b) => J[a.joints[a.joints.length - 1]].x - J[b.joints[b.joints.length - 1]].x);
    f.legOf = new Int16Array(n).fill(-1);
    f.legs = legs.map((c, k) => { for (const j of c.joints) f.legOf[j] = k; return { pivot:c.pivot, phase:k % 2 ? Math.PI : 0 }; });
    // 防御の構え：足以外の手足を体の前へ寄せる（付け根からの順番で、先ほど前へ）
    f.armOf = new Int16Array(n).fill(-1); f.armRank = new Float32Array(n);
    f.arms = f.chains.filter(c => !legs.includes(c)).map((c, k) => {
      c.joints.forEach((j, i) => { f.armOf[j] = k; f.armRank[j] = (i + 1) / c.joints.length; });
      return { pivot:c.pivot };
    });
    f.body = Math.max(0.25, f.rad[0] + 0.1);
    let hw = 0.2;
    for (let j = 0; j < n; j++) hw = Math.max(hw, Math.abs(f.ox[j]) + f.rad[j]);
    f.halfW = hw;

    // 頂点ごとのボーン割り当て（ボーンの向きに沿った座標で持つ）
    const nv = data.nv;
    f.nv = nv;
    f.bj1 = new Int16Array(nv); f.bu1 = new Float32Array(nv); f.bv1 = new Float32Array(nv);
    f.bj2 = new Int16Array(nv); f.bu2 = new Float32Array(nv); f.bv2 = new Float32Array(nv); f.bw = new Float32Array(nv);
    const local = (j, px, py) => {
      const A = J[J[j].par], B = J[j];
      const L = Math.hypot(B.x - A.x, B.y - A.y) || 1e-6;
      const X0x = (B.x - A.x) / L, X0y = (B.y - A.y) / L;
      return [(px - A.x) * X0x + (py - A.y) * X0y, (px - A.x) * -X0y + (py - A.y) * X0x, L];
    };
    for (let i = 0; i < nv; i++){
      const lb = data.vlab[i], px = data.rx[i], py = data.ry[i];
      if (lb <= 0 || n === 1){ f.bj1[i] = -1; f.bu1[i] = px - J[0].x; f.bv1[i] = py - J[0].y; continue; }
      const [u, v, L] = local(lb, px, py);
      f.bj1[i] = lb; f.bu1[i] = u; f.bv1[i] = v;
      // 関節の手前・先の両側で隣のボーンと半分ずつ混ぜる（関節の位置で左右が同じ形になり、継ぎ目が裂けない）
      const pj = J[lb].par, bl = L * BLEND;
      let j2 = -1, w = 0;
      const nearest = (list, A) => {   // 候補のボーンのうち、この頂点に一番近いもの
        let best = Infinity, r = -1;
        for (const c of list){
          const B = J[c], d = segDist(px, py, 0, A.x, A.y, 0, B.x, B.y, 0);
          if (d < best){ best = d; r = c; }
        }
        return r;
      };
      if (u < bl && pj > 0){ j2 = pj; w = 0.5 * (1 - Math.max(u, 0) / bl); }
      else if (u < bl && kidsOf[0].length > 1){   // 根元から出るボーンどうしは互いに混ぜる
        j2 = nearest(kidsOf[0].filter(c => c !== lb), J[0]); w = 0.5 * (1 - Math.max(u, 0) / bl);
      }
      else if (kidsOf[lb].length && u > L - bl){
        j2 = nearest(kidsOf[lb], J[lb]);   // 子が複数あるときは一番近い子
        w = 0.5 * Math.min(1, (u - (L - bl)) / bl);
      }
      if (j2 > 0 && w > 0){
        const [u2, v2] = local(j2, px, py);
        f.bj2[i] = j2; f.bu2[i] = u2; f.bv2[i] = v2; f.bw[i] = w;
      }
    }

    // メッシュ：表（+厚さ）と裏（-厚さ）の2枚を重ねて、ふくらんだ立体にする
    f.thick = data.thick;
    f.maxThick = data.thick.reduce((a, b) => Math.max(a, b), 0);
    f.vpos = new Float32Array(nv * 6);
    const uv2 = new Float32Array(nv * 4);
    uv2.set(data.uv, 0); uv2.set(data.uv, nv * 2);
    const IndexArray = nv * 2 > 65535 ? Uint32Array : Uint16Array;
    const idx = new IndexArray(data.index.length * 2);
    idx.set(data.index, 0);
    for (let t = 0; t < data.index.length; t += 3){   // 裏は向きを逆にする
      idx[data.index.length + t] = data.index[t] + nv;
      idx[data.index.length + t + 1] = data.index[t + 2] + nv;
      idx[data.index.length + t + 2] = data.index[t + 1] + nv;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(f.vpos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv2, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    const tex = new THREE.CanvasTexture(displayTexture(data.tex));
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();   // 斜めから見たときもぼやけ・ちらつきを抑える
    tex.needsUpdate = true;
    // 2人が同じ奥行きで重なったときのちらつき防止：描画の奥行きをキャラごとにずらす（layer が小さいほど手前）
    const mat = new THREE.MeshLambertMaterial({ map:tex, side:THREE.DoubleSide,
      polygonOffset:true, polygonOffsetFactor:layer * 2, polygonOffsetUnits:layer * 8 });
    f.mesh = new THREE.Mesh(geo, mat);
    f.mesh.frustumCulled = false;
    f.geo = geo; f.tex = tex; f.mat = mat; f.inflate = 1;
    // 足元の影（奥行きの位置を分かりやすくするため）
    f.shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 32),
      new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.18, depthWrite:false }));
    f.shadow.rotation.x = -Math.PI / 2;
    const sr = Math.max(0.3, f.halfW * 0.6);   // 向きが変わるので丸い影にする
    f.shadow.scale.set(sr, sr, 1);
    scene.add(f.mesh, f.shadow);
    return f;
  }
  function disposeFighter(f){
    if (!f) return;
    scene.remove(f.mesh, f.shadow);
    f.geo.dispose(); f.mat.dispose(); f.tex.dispose();
    if (f.tex.image) f.tex.image.width = f.tex.image.height = 0;   // 表示用の絵のキャンバスも手放す
    f.shadow.geometry.dispose(); f.shadow.material.dispose();
  }
  const rand = ([a, b]) => a + Math.random() * (b - a);
  // 向き：絵の正面（nx, nz）を相手のほうへ向ける。instant なら一瞬で向く
  function faceToward(f, opp, dt, instant){
    const dx = opp.x - f.x, dz = opp.z - f.z;
    if (Math.hypot(dx, dz) < 1e-4) return;
    const want = Math.atan2(dx, dz);
    if (instant || f.yaw === undefined){ f.yaw = want; }
    else {
      let d = want - f.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      f.yaw += Math.max(-TURN_SPEED * dt, Math.min(TURN_SPEED * dt, d));
    }
    f.nx = Math.sin(f.yaw); f.nz = Math.cos(f.yaw);
  }
  function resetFighter(f, x, z){
    // 能力は対戦ごとにランダム（表示しやすいよう力と速さは0.1刻み）
    f.power = Math.round(rand(STAT.power) * 10) / 10;
    f.spd = Math.round(rand(STAT.speed) * 10) / 10;
    f.hpMax = Math.round(rand(STAT.hp));
    f.def = Math.round(rand(STAT.def) * 10) / 10;
    f.guardWant = false; f.guard = false; f.blockStun = false; f.guardAmt = 0; f.stam = STAM_MAX; f.stamT = 0; f.broken = false; f.seenAtk = null; f.guardT = 0;
    f.x = x; f.z = z; f.kvx = f.kvz = 0; f.ix = f.iz = 0;
    f.walk = 0; f.legT = 0; f.mvx = 0; f.mvz = 1;
    f.down = false; f.fallA = 0; f.fallV = 0;
    if (f.nx !== undefined) bodyAxes(f);
    f.hp = f.hpMax; f.atk = null; f.atkMark.fill(0); f.cool = 0; f.stun = 0; f.think = 1;
    if (f.nx === undefined){ f.nx = 0; f.nz = 1; }
    bodyAxes(f);
    for (let j = 0; j < f.n; j++){   // 絵の横方向は、正面に対して右向き（nz, -nx）
      f.pos[3*j] = x + f.nz * f.ox[j]; f.pos[3*j+1] = f.restY0 + f.oy[j]; f.pos[3*j+2] = z - f.nx * f.ox[j];
    }
    f.prev.set(f.pos);
  }

  // 関節の位置から絵を変形させる（各ボーンの向きに頂点を乗せ、関節まわりは親ボーンと混ぜる）
  function deform(f){
    const P = f.pos, F = f.frame, NX = f.bnx, NY = f.bny, NZ = f.bnz;   // 絵の正面の向き（倒れると上を向く）
    // ボーンごとの向き：X＝ボーンの向き、Y＝絵の面内の横、Z＝絵の面の正面（厚さの方向）
    for (let j = 1; j < f.n; j++){
      const a = 3 * f.par[j], b = 3 * j, o = 12 * j;
      let x = P[b] - P[a], y = P[b+1] - P[a+1], z = P[b+2] - P[a+2];
      const l = Math.hypot(x, y, z) || 1; x /= l; y /= l; z /= l;
      // Y = 正面 × X
      let yx = NY * z - NZ * y, yy = NZ * x - NX * z, yz = NX * y - NY * x;
      if (Math.hypot(yx, yy, yz) < 1e-3){ yx = 0; yy = 1; yz = 0; const d = y; yx -= x * d; yy -= y * d; yz -= z * d; }   // ボーンが真正面を向いたとき
      const yl = Math.hypot(yx, yy, yz) || 1; yx /= yl; yy /= yl; yz /= yl;
      F[o] = P[a]; F[o+1] = P[a+1]; F[o+2] = P[a+2];
      F[o+3] = x; F[o+4] = y; F[o+5] = z;
      F[o+6] = yx; F[o+7] = yy; F[o+8] = yz;
      F[o+9] = x * 0 + (y * yz - z * yy); F[o+10] = z * yx - x * yz; F[o+11] = x * yy - y * yx;   // Z = X × Y
    }
    const V = f.vpos, nv = f.nv;
    // ふくらみ（0＝描いた絵そのままの平ら、1＝立体）。平らなときは部位ごとの段差もなくし、表と裏だけわずかに離す
    const inf = f.inflate, flat = (1 - inf) * 0.003;
    for (let i = 0; i < nv; i++){
      const j1 = f.bj1[i];
      let px, py, pz, zx, zy, zz, th;
      if (j1 < 0){   // 根元に固定の部分：向きだけ回す
        px = P[0] + f.nz * f.bu1[i] + f.ux * f.bv1[i]; py = P[1] + f.uy * f.bv1[i]; pz = P[2] - f.nx * f.bu1[i] + f.uz * f.bv1[i];
        zx = NX; zy = NY; zz = NZ; th = f.thick[i] * inf + flat;
      } else {
        const o = 12 * j1, u = f.bu1[i], v = f.bv1[i];
        px = F[o] + F[o+3] * u + F[o+6] * v;
        py = F[o+1] + F[o+4] * u + F[o+7] * v;
        pz = F[o+2] + F[o+5] * u + F[o+8] * v;
        zx = F[o+9]; zy = F[o+10]; zz = F[o+11];
        const zk = Math.min(1, f.thick[i] * 20);   // 輪郭（厚さ0）ではずらさない＝表と裏が縁でぴったり閉じる
        th = (f.thick[i] + f.zoff[j1] * zk) * inf + flat;
        const w = f.bw[i];
        if (w > 0){
          const o2 = 12 * f.bj2[i], u2 = f.bu2[i], v2 = f.bv2[i];
          px += (F[o2] + F[o2+3] * u2 + F[o2+6] * v2 - px) * w;
          py += (F[o2+1] + F[o2+4] * u2 + F[o2+7] * v2 - py) * w;
          pz += (F[o2+2] + F[o2+5] * u2 + F[o2+8] * v2 - pz) * w;
          zx += (F[o2+9] - zx) * w; zy += (F[o2+10] - zy) * w; zz += (F[o2+11] - zz) * w;
          th += (f.zoff[f.bj2[i]] - f.zoff[j1]) * zk * w * inf;
        }
      }
      // 表は正面側へ、裏は背中側へ厚さの分だけずらす
      V[3*i] = px + zx * th; V[3*i+1] = py + zy * th; V[3*i+2] = pz + zz * th;
      const k = 3 * (i + nv);
      V[k] = px - zx * th; V[k+1] = py - zy * th; V[k+2] = pz - zz * th;
    }
    f.geo.attributes.position.needsUpdate = true;
    f.geo.computeVertexNormals();   // 陰影のための法線
    f.shadow.position.set(f.x, 0.01, f.z);
  }

  // ===== 物理（関節を点として動かし、ボーンの長さを保つ） =====
  // 体の向き：倒れる角度 a だけ、右方向を軸に後ろ（正面と逆）へ傾けた「上」と「正面」
  function bodyAxes(f){
    const a = f.fallA, c = Math.cos(a), sn = Math.sin(a);
    f.ux = -f.nx * sn; f.uy = c; f.uz = -f.nz * sn;   // 上
    f.bnx = f.nx * c; f.bny = sn; f.bnz = f.nz * c;   // 正面（仰向けで真上を向く）
  }
  function physStep(f, opp, dt){
    const P = f.pos, Q = f.prev, n = f.n;
    // やられたら後ろへ倒れる（足元を軸に回し、地面で少し跳ねて止まる）
    if (f.down){
      f.fallV += FALL_ACCEL * Math.cos(Math.min(f.fallA, FALL_MAX)) * dt + FALL_ACCEL * 0.3 * dt;
      f.fallA += f.fallV * dt;
      if (f.fallA >= FALL_MAX){ f.fallA = FALL_MAX; f.fallV = Math.abs(f.fallV) > 0.6 ? -f.fallV * FALL_BOUNCE : 0; }
    }
    bodyAxes(f);
    // 根元（体の中心）は操作どおりに動かす（倒れているときは足元を軸に回した位置。背中が床に沈まないよう厚さ分持ち上げる）
    const lift = f.maxThick * Math.sin(f.fallA);
    P[0] = Q[0] = f.x + f.ux * f.restY0; P[1] = Q[1] = f.uy * f.restY0 + lift; P[2] = Q[2] = f.z + f.uz * f.restY0;
    const a = f.atk, ch = a && a.chain;
    let mode = 0;
    if (a){ if (a.t < ATK_WIND) mode = 1; else if (a.t < ATK_WIND + ATK_STRIKE) mode = 2; }
    const g = (f.down ? DOWN_GRAVITY : GRAVITY) * dt * dt;
    for (let j = 1; j < n; j++){
      const k = 3 * j;
      const vx = (P[k] - Q[k]) * DAMP, vy = (P[k+1] - Q[k+1]) * DAMP, vz = (P[k+2] - Q[k+2]) * DAMP;
      Q[k] = P[k]; Q[k+1] = P[k+1]; Q[k+2] = P[k+2];
      P[k] += vx; P[k+1] += vy - g; P[k+2] += vz;
      if (mode && f.atkMark[j]) continue;
      let s = f.stiff[j];   // 描いたときの形（今の向きに回したもの）に戻ろうとする
      let tx = P[0] + f.nz * f.ox[j] + f.ux * f.oy[j], ty = P[1] + f.uy * f.oy[j], tz = P[2] - f.nx * f.ox[j] + f.uz * f.oy[j];
      const lg = f.legOf[j];
      if (f.down) s *= DOWN_STIFF;   // 倒れたらぐったり
      if (lg >= 0 && f.walk > 0.01 && !f.down){
        // 足：付け根からの向きを、進む向きに対して前後に振る（進む向きと上の外積を軸にして回す）
        const L = f.legs[lg], p = L.pivot;
        const bx = P[0] + f.nz * f.ox[p], by = P[1] + f.oy[p], bz = P[2] - f.nx * f.ox[p];
        const wx = tx - bx, wy = ty - by, wz = tz - bz;
        const ax = f.mvz, az = -f.mvx;   // 回転軸（水平で、進む向きに直角）
        const th = Math.sin(f.legT + L.phase) * LEG_SWING * f.walk, c = Math.cos(th), sn = Math.sin(th);
        const dot = ax * wx + az * wz;
        const cx = -az * wy, cy = az * wx - ax * wz, cz = ax * wy;   // 軸 × w
        tx = bx + wx * c + cx * sn + ax * dot * (1 - c);
        ty = by + wy * c + cy * sn;
        tz = bz + wz * c + cz * sn + az * dot * (1 - c);
        s = s + (LEG_STIFF - s) * f.walk;
      }
      const am = f.armOf[j];
      if (am >= 0 && f.guardAmt > 0.01 && !f.down){
        // 防御：付け根からの形を半分に縮めて、体の前（正面の向き）へ出す
        const p = f.arms[am].pivot, g = f.guardAmt;
        const bx = P[0] + f.nz * f.ox[p], by = P[1] + f.oy[p], bz = P[2] - f.nx * f.ox[p];
        const gx = bx + (tx - bx) * 0.45 + f.nx * GUARD_FWD * f.armRank[j];
        const gy = by + (ty - by) * 0.45;
        const gz = bz + (tz - bz) * 0.45 + f.nz * GUARD_FWD * f.armRank[j];
        tx += (gx - tx) * g; ty += (gy - ty) * g; tz += (gz - tz) * g;
        s = s + (LEG_STIFF - s) * g;
      }
      P[k]   += (tx - P[k]) * s;
      P[k+1] += (ty - P[k+1]) * s;
      P[k+2] += (tz - P[k+2]) * s;
    }
    if (ch && mode){
      const pv = 3 * ch.pivot, O = opp.pos;
      let dx = O[0] - P[pv], dy = O[1] - P[pv+1], dz = O[2] - P[pv+2];
      const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
      if (mode === 1){ dx = -dx * 0.5; dy = 0.5; dz = -dz * 0.5; }   // 振りかぶり：狙いと逆へ引く
      for (let c = 0; c < ch.joints.length; c++){
        const k = 3 * ch.joints[c], r = ch.cum[c];
        P[k]   += (P[pv]   + dx * r - P[k])   * ATK_STIFF;
        P[k+1] += (P[pv+1] + dy * r - P[k+1]) * ATK_STIFF;
        P[k+2] += (P[pv+2] + dz * r - P[k+2]) * ATK_STIFF;
      }
    }
    for (let it = 0; it < ITER; it++){
      for (let j = 1; j < n; j++){
        const p = f.par[j], a3 = 3 * p, b = 3 * j;
        const dx = P[b] - P[a3], dy = P[b+1] - P[a3+1], dz = P[b+2] - P[a3+2];
        const d = Math.hypot(dx, dy, dz) || 1e-6, diff = (d - f.len[j]) / d;
        if (p === 0){ P[b] -= dx * diff; P[b+1] -= dy * diff; P[b+2] -= dz * diff; }
        else {
          const h = diff * 0.5;
          P[b] -= dx * h; P[b+1] -= dy * h; P[b+2] -= dz * h;
          P[a3] += dx * h; P[a3+1] += dy * h; P[a3+2] += dz * h;
        }
      }
    }
    for (let j = 1; j < n; j++) if (P[3*j+1] < 0.02) P[3*j+1] = 0.02;
  }

  // ===== 攻撃 =====
  const pickChain = f => f.chains.length ? f.chains[Math.floor(Math.random() * f.chains.length)] : null;   // 使う手足は毎回ランダム
  function startAttack(f, opp, chain = pickChain(f)){
    if (f.atk || f.cool > 0 || f.stun > 0 || f.guard || f.stam <= 0) return;   // 防御中・スタミナ切れは攻撃できない
    f.stam = Math.max(0, f.stam - STAM_ATK); f.stamT = STAM_DELAY;
    if (!chain){ f.atk = { t:0, chain:null, hit:false }; return; }   // 手足が無い絵は体当たり
    f.atk = { t:0, chain, hit:false };
    for (const j of chain.joints) f.atkMark[j] = 1;
  }
  function endAttack(f, cool){
    f.atk = null; f.atkMark.fill(0);
    if (cool) f.cool = ATK_COOL;
  }
  function segDist(px, py, pz, ax, ay, az, bx, by, bz){
    const vx = bx - ax, vy = by - ay, vz = bz - az;
    const vv = vx*vx + vy*vy + vz*vz;
    let t = vv > 0 ? ((px-ax)*vx + (py-ay)*vy + (pz-az)*vz) / vv : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - ax - vx*t, py - ay - vy*t, pz - az - vz*t);
  }
  function hitTest(f, opp){
    const P = f.pos, O = opp.pos;
    const tips = f.atk.chain ? f.atk.chain.joints.slice(-2) : f.allIdx;
    for (const t of tips){
      const k = 3 * t, r = Math.max(f.rad[t], 0.05) + HIT_PAD;
      for (let j = opp.n > 1 ? 1 : 0; j < opp.n; j++){
        const p = j > 0 ? opp.par[j] : 0, a = 3 * p, b = 3 * j;
        const rr = Math.max(opp.rad[j], opp.rad[p]);
        if (segDist(P[k], P[k+1], P[k+2], O[a], O[a+1], O[a+2], O[b], O[b+1], O[b+2]) < r + rr){
          applyHit(f, opp, t);
          return;
        }
      }
    }
  }
  function applyHit(f, opp, t){
    const P = f.pos, Q = f.prev, O = opp.pos, k = 3 * t;
    const sp = Math.hypot(P[k] - Q[k], P[k+1] - Q[k+1], P[k+2] - Q[k+2]) / STEP;
    const base = DMG_MIN + (DMG_MAX - DMG_MIN) * Math.min(1, sp / SPEED_FULL);
    // ダメージ = 基本 × 自分の力 × (2 − 相手の守り) × ばらつき
    let raw = base * f.power * (2 - opp.def) * (1 + (Math.random() * 2 - 1) * DMG_RAND);
    let guarded = false, broke = false;
    if (opp.guard){
      guarded = true;   // 防いだ攻撃は体力が減らず、スタミナが減る
      opp.stam -= raw * STAM_GUARD / opp.def; opp.stamT = STAM_DELAY;
      if (opp.stam <= 0){   // スタミナが尽きるとガードが崩れる：この一撃は防げるが、しばらく無防備になる
        opp.stam = 0; opp.guard = false; opp.broken = true; broke = true;
      }
    }
    const dmg = guarded ? 0 : Math.max(1, Math.round(raw));
    opp.hp = Math.max(0, opp.hp - dmg);
    const fxDmg = Math.max(1, Math.round(raw));   // 演出の大きさは防いだときも攻撃の強さに合わせる
    let dx = opp.x - f.x, dz = opp.z - f.z;
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const kb = guarded && !broke ? GUARD_KB : 1;
    opp.kvx += dx * KNOCKBACK * kb; opp.kvz += dz * KNOCKBACK * kb;
    opp.stun = broke ? GUARD_BREAK_STUN : guarded ? GUARD_STUN : STUN;
    opp.blockStun = guarded && !broke;   // 防いだ直後の短い硬直中も防御は続ける（続けて来た攻撃も防げるように）
    if (opp.atk) endAttack(opp, false);
    // 当たった所の近くほど大きくたわませる
    for (let j = 1; j < opp.n; j++){
      const b = 3 * j;
      const fa = Math.max(0, 1 - Math.hypot(O[b] - P[k], O[b+1] - P[k+1], O[b+2] - P[k+2]) / 1.2);
      const hs = HIT_SHAKE * fa * kb;
      opp.prev[b] -= dx * hs; opp.prev[b+1] -= 0.4 * hs; opp.prev[b+2] -= dz * hs;
    }
    f.atk.hit = true;
    updateHud();
    // 演出：止める・揺らす・光らせる・火花と数字を出す
    hitStop = Math.max(hitStop, (HITSTOP_BASE + fxDmg * HITSTOP_PER_DMG) * (guarded ? 0.6 : 1));
    shake = Math.max(shake, fxDmg * SHAKE_PER_DMG * (guarded ? 0.5 : 1));
    if (!guarded) opp.flash = FLASH_TIME;   // 防いだときは赤く光らせない
    if (broke){ shake = Math.max(shake, BREAK_SHAKE); hitStop = Math.max(hitStop, BREAK_HITSTOP); }
    fxHit(P[k], P[k+1], P[k+2], dx, dz, fxDmg, guarded, broke);
  }
  function attackUpdate(f, opp, dt){
    const a = f.atk; if (!a) return;
    const t0 = a.t; a.t += dt;
    if (t0 < ATK_WIND && a.t >= ATK_WIND){   // 踏み込み
      let dx = opp.x - f.x, dz = opp.z - f.z;
      const l = Math.hypot(dx, dz) || 1;
      const v = a.chain ? LUNGE : LUNGE * 2.5;
      f.kvx += dx / l * v; f.kvz += dz / l * v;
    }
    if (state === 'fight' && a.t >= ATK_WIND && a.t < ATK_WIND + ATK_STRIKE && !a.hit) hitTest(f, opp);
    if (f.atk && a.t >= ATK_WIND + ATK_STRIKE) endAttack(f, true);
  }

  // ===== 移動・CPU =====
  function move(f, ix, iz, speed, dt){
    if (f.stun > 0){ f.stun -= dt; ix = iz = 0; }
    if (f.stun <= 0) f.blockStun = false;
    if (f.cool > 0) f.cool -= dt;
    // 防御：押している間（攻撃中・動けない間・ガードが崩れている間は除く）
    if (f.broken && f.stun <= 0) f.broken = false;
    // スタミナ0でも構えられる（その状態で攻撃を受けるとガードが崩れる）
    f.guard = f.guardWant && !f.atk && (f.stun <= 0 || f.blockStun) && !f.broken;
    f.guardAmt += ((f.guard ? 1 : 0) - f.guardAmt) * Math.min(1, dt * 18);
    // スタミナの回復：使ってから少し待ってから。攻撃中は回復せず、防御を構えている間はゆっくり
    if (f.stamT > 0) f.stamT -= dt;
    else if (!f.atk) f.stam = Math.min(STAM_MAX, f.stam + STAM_REGEN * (f.guard ? STAM_REGEN_GUARD : 1) * dt);
    speed *= 1 - (1 - GUARD_SPEED) * f.guardAmt;
    const vx = ix * speed + f.kvx, vz = iz * speed + f.kvz;
    f.x += vx * dt;
    f.z += vz * dt;
    // 足を振る量（動く速さに合わせて0〜1）と、振る向き（進む向き）
    const sp = Math.hypot(vx, vz);
    f.walk += (Math.min(1, sp / MOVE_SPEED) - f.walk) * Math.min(1, dt * 12);
    if (sp > 0.1){ f.mvx = vx / sp; f.mvz = vz / sp; }
    if (f.walk > 0.01) f.legT += dt * LEG_FREQ * Math.PI * 2;
    const fr = Math.exp(-KB_FRICTION * dt);
    f.kvx *= fr; f.kvz *= fr;
    const r = Math.hypot(f.x, f.z), lim = ARENA_R - 0.4;
    if (r > lim){ f.x *= lim / r; f.z *= lim / r; }
  }
  function separate(){
    let dx = enemy.x - player.x, dz = enemy.z - player.z;
    let d = Math.hypot(dx, dz);
    if (d < 1e-4){ dx = 1; dz = 0; d = 1e-4; }
    const min = player.body + enemy.body;
    if (d < min){
      const push = (min - d) / 2;
      player.x -= dx / d * push; player.z -= dz / d * push;
      enemy.x  += dx / d * push; enemy.z  += dz / d * push;
    }
  }
  // CPUが使う手足：体が太くて、立てる距離から相手に届かない短い手足は選ばない（無いときは一番長い手足）
  function cpuChain(e){
    if (!e.chains.length) return null;
    const ok = e.chains.filter(c => c.reach + HIT_PAD > e.body + 0.05);
    return ok.length ? ok[Math.floor(Math.random() * ok.length)] : e.chains.reduce((a, b) => (a.reach > b.reach ? a : b));
  }
  function cpuThink(dt){
    const e = enemy, p = player, ai = e.ai;
    e.think -= dt;
    if (e.retreatT > 0) e.retreatT -= dt;
    // 防御：相手が攻撃を始めたら、一定の確率で少し遅れて防御し、攻撃が終わるまで続ける
    if (p.atk && p.atk !== e.seenAtk){
      e.seenAtk = p.atk;
      e.guardT = Math.random() < ai.guard && Math.hypot(p.x - e.x, p.z - e.z) < p.reach + p.body + 1 ? ai.react : -1;
    }
    if (e.guardT > 0){ e.guardT -= dt; if (e.guardT <= 0) e.guardT = 0; }
    const wasGuard = e.guardWant;
    e.guardWant = e.guardT === 0 && !!p.atk && p.atk === e.seenAtk;
    if (ai.counter && wasGuard && !e.guardWant && !e.broken) e.think = 0;   // 防ぎ切ったらすぐ反撃
    if (e.stun > 0 || e.atk){ e.ix = e.iz = 0; return; }
    // 次に使う手足を先に決め、その手足が相手の体の表面に届く距離まで近づいてから攻撃する
    // （相手の絵が太いと中心までは届かないので、中心との距離ではなく表面との距離で判断する）
    if (e.next === undefined) e.next = cpuChain(e);
    const range = (e.next ? e.next.reach : e.body) + HIT_PAD;
    let want = p.body + Math.max(e.body, range * ai.dist);   // 届く距離より少し内側に立つ（戦い方で変わる）
    if (e.retreatT > 0) want += RETREAT_DIST;                // 逃げ足：攻撃したあとはしばらく下がる
    const tired = e.stam <= Math.max(0, STAM_MAX * ai.stam); // スタミナが足りない間は少し離れて回復を待つ
    if (tired) want += TIRED_DIST;
    let ux = e.x - p.x, uz = e.z - p.z;   // 相手から自分への向き（この向きのまま距離だけ合わせる）
    const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
    const dx = p.x + ux * want - e.x, dz = p.z + uz * want - e.z, l = Math.hypot(dx, dz);
    if (l > 0.05){ const k = Math.min(1, l / 0.3); e.ix = dx / l * k; e.iz = dz / l * k; } else e.ix = e.iz = 0;   // 近くでは減速して行き過ぎない
    if (ai.strafe > 0){   // 回り込み：相手の周りを横へ回る（ときどき向きを変える）
      e.orbitT -= dt;
      if (e.orbitT <= 0){ e.orbitDir = -e.orbitDir; e.orbitT = 1.5 + Math.random() * 2; }
      e.ix += -uz * ai.strafe * e.orbitDir; e.iz += ux * ai.strafe * e.orbitDir;
      const il = Math.hypot(e.ix, e.iz); if (il > 1){ e.ix /= il; e.iz /= il; }
    }
    const surface = Math.hypot(p.x - e.x, p.z - e.z) - p.body;
    if (e.think <= 0 && surface < range && !e.guard && !(e.retreatT > 0) && !tired){
      startAttack(e, p, e.next);
      e.next = undefined;
      e.think = ai.waitMin + Math.random() * (ai.waitMax - ai.waitMin);
      if (ai.retreat > 0) e.retreatT = ai.retreat + ATK_WIND + ATK_STRIKE;
    }
  }

  function startIntro(){
    state = 'intro'; introT = 0;
    player.inflate = enemy.inflate = 0;
  }
  function introUpdate(dt){
    const t0 = introT; introT += dt;
    const t = introT - INTRO_HOLD;   // ボンッからの経過時間
    if (t0 < INTRO_HOLD && introT >= INTRO_HOLD){ fxPoof(player); fxPoof(enemy); shake += INTRO_SHAKE; }
    if (t >= INTRO_SWAP){
      const r = Math.min(1, (t - INTRO_SWAP) / POPIN_TIME);
      const s = 1 + POPIN_SCALE * Math.sin(r * Math.PI) * (1 - r * 0.5);   // ぽんと大きくなって戻る
      for (const f of [player, enemy]){
        f.inflate = 1;
        f.mesh.scale.setScalar(s); f.mesh.position.set(f.x * (1 - s), 0, f.z * (1 - s));   // 足元を中心に大きくする
      }
    }
    if (t >= INTRO_END){
      for (const f of [player, enemy]){ f.mesh.scale.setScalar(1); f.mesh.position.set(0, 0, 0); }
      state = 'fight';
    }
  }
  function startFight(){
    player.nx = undefined; enemy.nx = undefined;
    player.x = 0; player.z = 1.6; enemy.x = 0; enemy.z = -1.6;   // 手前が自分、奥が相手
    faceToward(player, enemy, 0, true); faceToward(enemy, player, 0, true);
    resetFighter(player, 0, 1.6);
    resetFighter(enemy, 0, -1.6);
    enemy.next = undefined;
    enemy.ai = CPU_TYPES[Math.floor(Math.random() * CPU_TYPES.length)];   // 戦い方は対戦ごとにランダム
    enemy.retreatT = 0; enemy.orbitT = 1; enemy.orbitDir = Math.random() < 0.5 ? 1 : -1;
    player.flash = enemy.flash = 0;
    for (const f of [player, enemy]){ f.inflate = 1; f.mesh.scale.setScalar(1); f.mesh.position.set(0, 0, 0); }
    hitStop = slowT = shake = 0;
    fxClear();
    state = 'fight'; acc = 0;
    
    updateHud();
    updateCamera(0, true);
  }

  const SPARK_MAX = 64, RING_MAX = 4;
  // 板ポリゴンをまとめた動的メッシュ（四角形 n 枚分）
  function quadMesh(n, mat){
    const pos = new Float32Array(n * 12), idx = new Uint16Array(n * 6);
    for (let i = 0; i < n; i++){ const v = i * 4; idx.set([v, v+1, v+2, v+2, v+1, v+3], i * 6); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false;
    scene.add(m);
    return { m, pos, geo };
  }
  function initFx(){
    const spark = css('--spark');
    fx = {
      sparks:[], rings:[], pops:[],
      sparkMesh:quadMesh(SPARK_MAX, new THREE.MeshBasicMaterial({ color:spark, side:THREE.DoubleSide })),
      ringPool:[...Array(RING_MAX)].map(() => {
        const r = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 32),
          new THREE.MeshBasicMaterial({ color:spark, transparent:true, depthWrite:false, side:THREE.DoubleSide }));
        r.visible = false; scene.add(r); return { m:r, t:1 };
      }),
      white:new THREE.Color(0xffffff), flash:new THREE.Color(css('--flash')), sparkC:new THREE.Color(spark),
      trailMat:new THREE.MeshBasicMaterial({ color:css('--trail'), transparent:true, opacity:0.55, depthWrite:false, side:THREE.DoubleSide }),
      layer:layer, v:new THREE.Vector3(),
      puffs:[], puffTex:puffTexture(),
      shards:[], shardTex:shardTexture(), starTex:starTexture(), dizzy:new Map(), dizzyT:0,
    };
  }
  // 煙の玉の絵：紙の色の丸に鉛筆の縁取り（重なると漫画の「ボンッ」の煙になる）
  function puffTexture(){
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2);
    g.fillStyle = css('--paper'); g.fill();
    g.lineWidth = 7; g.strokeStyle = css('--ink'); g.stroke();
    const t = new THREE.CanvasTexture(c);
    return t;
  }
  // 破片の絵：紙の色の三角に鉛筆の縁取り
  function shardTexture(){
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.beginPath(); g.moveTo(10, 54); g.lineTo(34, 6); g.lineTo(56, 46); g.closePath();
    g.fillStyle = css('--paper'); g.fill(); g.lineWidth = 5; g.lineJoin = 'round'; g.strokeStyle = css('--ink'); g.stroke();
    return new THREE.CanvasTexture(c);
  }
  // 頭の上を回る星の絵：黄色の星に鉛筆の縁取り
  function starTexture(){
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.beginPath();
    for (let i = 0; i < 10; i++){ const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 12 : 28; g[i ? 'lineTo' : 'moveTo'](32 + Math.cos(a) * r, 34 + Math.sin(a) * r); }
    g.closePath(); g.fillStyle = css('--spark'); g.fill(); g.lineWidth = 4; g.lineJoin = 'round'; g.strokeStyle = css('--ink'); g.stroke();
    return new THREE.CanvasTexture(c);
  }
  // ガードが崩れた：当たった所から紙の破片を飛び散らせる
  function fxBreak(x, y, z, dx, dz){
    for (let i = 0; i < SHARD_N; i++){
      const a = Math.random() * Math.PI * 2;
      let vx = Math.cos(a) + dx * 0.6, vy = 0.6 + Math.random() * 1.2, vz = Math.sin(a) + dz * 0.6;
      const l = Math.hypot(vx, vy, vz) || 1, sp = SHARD_SPEED * (0.5 + Math.random() * 0.7);
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map:fx.shardTex, transparent:true, rotation:Math.random() * 6.28 }));
      m.position.set(x, y, z); m.scale.setScalar(SHARD_SIZE * (0.6 + Math.random() * 0.8));
      scene.add(m);
      fx.shards.push({ m, vx:vx / l * sp, vy:vy / l * sp, vz:vz / l * sp, rv:(Math.random() * 2 - 1) * 12, t:0, s:m.scale.x });
    }
  }
  function fxPoof(f){
    if (!fx) return;
    // 絵の上のあちこち（メッシュの頂点からランダムに選ぶ）から煙を出す
    const V = f.vpos, nv = f.nv;
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < nv; i++){ cx += V[3*i]; cy += V[3*i+1]; cz += V[3*i+2]; }
    cx /= nv; cy /= nv; cz /= nv;
    const size = PUFF_SIZE * Math.max(1, Math.min(1.4, f.halfW / 0.6));
    for (let k = 0; k < PUFF_N; k++){
      const i = Math.floor(Math.random() * nv);
      const x = V[3*i], y = V[3*i+1], z = V[3*i+2];
      let dx = x - cx, dy = y - cy, dz = z - cz;
      const l = Math.hypot(dx, dy, dz) || 1, sp = PUFF_SPEED * (0.4 + Math.random() * 0.8);
      const sm = new THREE.Sprite(new THREE.SpriteMaterial({ map:fx.puffTex, transparent:true, depthTest:false, depthWrite:false }));
      sm.renderOrder = 10; sm.position.set(x, y, z); sm.scale.setScalar(0.001);
      scene.add(sm);
      fx.puffs.push({ m:sm, vx:dx / l * sp, vy:dy / l * sp + 0.4, vz:dz / l * sp, t:0,
        life:PUFF_LIFE * (0.7 + Math.random() * 0.3), size:size * (0.6 + Math.random() * 0.7) });
    }
    // 中心から火花も散らす
    for (let k = 0; k < SPARK_N; k++){
      const a = Math.random() * Math.PI * 2, b = Math.random() * 1.2 - 0.3, sp = SPARK_SPEED * (0.6 + Math.random() * 0.6);
      if (fx.sparks.length >= SPARK_MAX) fx.sparks.shift();
      fx.sparks.push({ x:cx, y:cy, z:cz, vx:Math.cos(a) * Math.cos(b) * sp, vy:Math.sin(b) * sp + 1, vz:Math.sin(a) * Math.cos(b) * sp,
        life:SPARK_LIFE * (0.8 + Math.random() * 0.5), max:SPARK_LIFE * 1.3 });
    }
  }
  function ensureTrail(f){
    if (!f.trail){ f.trail = quadMesh(TRAIL_LEN - 1, fx.trailMat); f.trailPts = []; }
  }
  function fxClear(){
    if (!fx) return;
    fx.sparks.length = 0;
    for (const r of fx.ringPool){ r.m.visible = false; r.t = 1; }
    for (const p of fx.pops) p.el.remove();
    fx.pops.length = 0;
    for (const p of fx.puffs){ scene.remove(p.m); p.m.material.dispose(); }
    for (const p of fx.shards){ scene.remove(p.m); p.m.material.dispose(); }
    fx.shards.length = 0;
    fx.puffs.length = 0;
    for (const f of [player, enemy]) if (f && f.trailPts) f.trailPts.length = 0;
  }
  function fxHit(x, y, z, dx, dz, dmg, guarded, broke){
    if (!fx) return;
    const n = Math.round(SPARK_N * (0.6 + dmg / DMG_MAX * 0.6) * (guarded ? 0.4 : 1));
    for (let i = 0; i < n; i++){   // 攻撃の向きに寄せて四方へ飛ばす
      let vx = dx * 0.8 + (Math.random() * 2 - 1), vy = Math.random() * 1.4 - 0.3, vz = dz * 0.8 + (Math.random() * 2 - 1) * 0.6;
      const l = Math.hypot(vx, vy, vz) || 1, sp = SPARK_SPEED * (0.5 + Math.random() * 0.8);
      if (fx.sparks.length >= SPARK_MAX) fx.sparks.shift();
      fx.sparks.push({ x, y, z, vx:vx / l * sp, vy:vy / l * sp, vz:vz / l * sp, life:SPARK_LIFE * (0.6 + Math.random() * 0.4), max:SPARK_LIFE });
    }
    const ring = fx.ringPool.reduce((a, b) => (a.t > b.t ? a : b));   // 一番古い輪を使い回す
    ring.t = 0; ring.size = RING_SIZE * (0.6 + dmg / DMG_MAX * 0.6);
    ring.m.position.set(x, y, z); ring.m.visible = true;
    ring.m.material.color.copy(guarded ? fx.white : fx.sparkC);
    if (broke){ fxBreak(x, y, z, dx, dz); ring.size *= 1.8; return; }   // 崩れたときは文字を出さず、破片と大きな輪で見せる
    const el = document.createElement('div');
    el.className = 'pop' + (guarded ? ' guard' : dmg >= BIG_HIT ? ' big' : '');
    el.textContent = guarded ? 'ガード' : dmg;   // 防いだときは体力が減らないので数字は出さない
    fx.layer.appendChild(el);
    fx.pops.push({ el, x, y, z, t:0 });
  }
  function fxUpdate(dt){
    if (!fx) return;
    const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
    // 被弾したキャラの赤い点滅
    for (const f of [player, enemy]){
      if (f.flash > 0) f.flash -= dt;
      f.mat.color.copy(fx.white).lerp(fx.flash, Math.max(0, f.flash / FLASH_TIME) * 0.8);
    }
    // 板をカメラに向けて a→b の帯として書き込む
    const strip = (pos, o, ax, ay, az, bx, by, bz, wa, wb) => {
      let tx = bx - ax, ty = by - ay, tz = bz - az;
      const vx = cx - ax, vy = cy - ay, vz = cz - az;
      let sx = ty * vz - tz * vy, sy = tz * vx - tx * vz, sz = tx * vy - ty * vx;
      const sl = Math.hypot(sx, sy, sz) || 1; sx /= sl; sy /= sl; sz /= sl;
      pos.set([ax - sx*wa, ay - sy*wa, az - sz*wa,  ax + sx*wa, ay + sy*wa, az + sz*wa,
               bx - sx*wb, by - sy*wb, bz - sz*wb,  bx + sx*wb, by + sy*wb, bz + sz*wb], o);
    };
    // 火花（速さの向きに伸びた細い板）
    const S = fx.sparkMesh;
    S.pos.fill(0);
    let k = 0;
    for (let i = fx.sparks.length - 1; i >= 0; i--){
      const p = fx.sparks[i];
      p.life -= dt;
      if (p.life <= 0){ fx.sparks.splice(i, 1); continue; }
      p.vy -= 9 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const a = p.life / p.max, w = SPARK_W * a;
      strip(S.pos, k * 12, p.x, p.y, p.z, p.x - p.vx * 0.035, p.y - p.vy * 0.035, p.z - p.vz * 0.035, w, w * 0.3);
      k++;
    }
    S.geo.attributes.position.needsUpdate = true;
    // 破片（くるくる回りながら落ちて、小さくなって消える）
    for (let i = fx.shards.length - 1; i >= 0; i--){
      const p = fx.shards[i];
      p.t += dt;
      if (p.t >= SHARD_LIFE){ scene.remove(p.m); p.m.material.dispose(); fx.shards.splice(i, 1); continue; }
      p.vy -= 9 * dt;
      p.m.position.x += p.vx * dt; p.m.position.y = Math.max(0.03, p.m.position.y + p.vy * dt); p.m.position.z += p.vz * dt;
      p.m.material.rotation += p.rv * dt;
      p.m.scale.setScalar(p.s * Math.min(1, (SHARD_LIFE - p.t) / (SHARD_LIFE * 0.4)));
    }
    // ガードが崩れている間：頭の上を星が回る
    fx.dizzyT += dt * DIZZY_SPEED;
    for (const f of [player, enemy]){
      let st = fx.dizzy.get(f);
      if (!st){
        st = [...Array(DIZZY_N)].map(() => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map:fx.starTex, transparent:true })); m.scale.setScalar(DIZZY_SIZE); m.visible = false; scene.add(m); return m; });
        fx.dizzy.set(f, st);
      }
      let top = 0, cx = 0, cz = 0;
      for (let j = 0; j < f.n; j++){ const y = f.pos[3*j+1]; if (y > top){ top = y; cx = f.pos[3*j]; cz = f.pos[3*j+2]; } }
      st.forEach((m, k) => {
        m.visible = f.broken;
        if (!f.broken) return;
        const a = fx.dizzyT + k * Math.PI * 2 / DIZZY_N;
        m.position.set(cx + Math.cos(a) * DIZZY_R, top + 0.25 + Math.sin(a * 2) * 0.03, cz + Math.sin(a) * DIZZY_R);
      });
    }
    // 煙の玉（ぽんとふくらんで外へ広がり、しぼんで消える）
    for (let i = fx.puffs.length - 1; i >= 0; i--){
      const p = fx.puffs[i];
      p.t += dt;
      if (p.t >= p.life){ scene.remove(p.m); p.m.material.dispose(); fx.puffs.splice(i, 1); continue; }
      const drag = Math.exp(-5 * dt);
      p.vx *= drag; p.vy *= drag; p.vz *= drag;
      p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
      const g = Math.min(1, p.t / PUFF_GROW), r = p.t / p.life;
      const sc = p.size * (1 - (1 - g) * (1 - g)) * (r > 0.5 ? 1 - (r - 0.5) / 0.5 : 1);
      p.m.scale.setScalar(Math.max(0.001, sc));
    }
    // 衝撃の輪（カメラを向いて広がりながら消える）
    for (const r of fx.ringPool){
      if (!r.m.visible) continue;
      r.t += dt / RING_LIFE;
      if (r.t >= 1){ r.m.visible = false; continue; }
      const e = 1 - (1 - r.t) * (1 - r.t);
      r.m.quaternion.copy(camera.quaternion);
      r.m.scale.setScalar(r.size * (0.25 + 0.75 * e));
      r.m.material.opacity = 1 - r.t;
    }
    // 攻撃の軌跡（手足の先の通り道を帯で描く）
    for (const f of [player, enemy]){
      ensureTrail(f);
      const a = f.atk, pts = f.trailPts;
      if (a && a.chain && a.t >= ATK_WIND * 0.5){
        const t = 3 * a.chain.joints[a.chain.joints.length - 1];
        pts.push([f.pos[t], f.pos[t+1], f.pos[t+2]]);
        if (pts.length > TRAIL_LEN) pts.shift();
      } else if (pts.length) pts.shift();   // 攻撃が終わったら後ろから縮める
      const T = f.trail;
      T.pos.fill(0);
      for (let i = 0; i + 1 < pts.length; i++){
        const p0 = pts[i], p1 = pts[i + 1], n = pts.length - 1;
        strip(T.pos, i * 12, p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], TRAIL_W * i / n, TRAIL_W * (i + 1) / n);
      }
      T.geo.attributes.position.needsUpdate = true;
    }
    // ダメージ数字（3D位置を画面に写して、浮かび上がりながら消える）
    const W = fx.layer.clientWidth, H = fx.layer.clientHeight;
    for (let i = fx.pops.length - 1; i >= 0; i--){
      const p = fx.pops[i];
      p.t += dt;
      if (p.t >= POP_LIFE){ p.el.remove(); fx.pops.splice(i, 1); continue; }
      const r = p.t / POP_LIFE;
      fx.v.set(p.x, p.y + 0.25 + r * 0.5, p.z).project(camera);
      const sc = r < 0.15 ? 0.6 + r / 0.15 * 0.6 : 1.2 - Math.min(0.2, (r - 0.15));   // ぽんと大きく出てから落ち着く
      p.el.style.transform = `translate(${(fx.v.x + 1) / 2 * W}px,${(1 - fx.v.y) / 2 * H}px) translate(-50%,-50%) scale(${sc})`;
      p.el.style.opacity = String(1 - r * r);
    }
  }

  // ===== カメラ（2人が画面に収まるように横から見る） =====
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  function updateCamera(dt, snap){
    // 自分の斜め後ろから、2人の中間を見る（自分の向き＝相手のほう）
    const fx = player.nx, fz = player.nz, rx = -fz, rz = fx;
    const d = Math.hypot(enemy.x - player.x, enemy.z - player.z);
    const mx = (player.x + enemy.x) / 2, mz = (player.z + enemy.z) / 2;
    const dist = CAM_DIST + d * 0.7 + Math.max(player.halfW, enemy.halfW) * 0.6;
    const cx = -fx * Math.cos(CAM_ANGLE) + rx * Math.sin(CAM_ANGLE), cz = -fz * Math.cos(CAM_ANGLE) + rz * Math.sin(CAM_ANGLE);
    const tp = new THREE.Vector3(mx + cx * dist, CAM_H + dist * 0.32, mz + cz * dist);
    const tl = new THREE.Vector3(mx, CHAR_H * 0.42, mz);
    if (snap){ camPos.copy(tp); camLook.copy(tl); }
    else { const k = 1 - Math.exp(-4 * dt); camPos.lerp(tp, k); camLook.lerp(tl, k); }
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    if (shake > 0.001){   // 揺れは向きを変えずに位置だけずらす（camPos には残さない）
      camera.position.x += (Math.random() * 2 - 1) * shake;
      camera.position.y += (Math.random() * 2 - 1) * shake;
      shake *= Math.exp(-SHAKE_DECAY * dt);
    }
    camera.updateMatrixWorld();
  }

  // ===== 1ステップ =====
  function tick(dt){
    let ix = 0, iz = 0;
    if (state === 'fight'){
      ix = jx + (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
      iz = jy + (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0);
      const l = Math.hypot(ix, iz); if (l > 1){ ix /= l; iz /= l; }
      // 画面の上＝相手のほう（自分の正面）、右＝自分の右
      const fx = player.nx, fz = player.nz, rx = -fz, rz = fx;
      const wx = rx * ix - fx * iz, wz = rz * ix - fz * iz;
      ix = wx; iz = wz;
      player.guardWant = defHeld || !!keys.Shift;
      cpuThink(dt);
    } else { enemy.ix = enemy.iz = 0; player.guardWant = enemy.guardWant = false; }
    if (!player.down) faceToward(player, enemy, dt);   // いつも相手のほうを向く（倒れたら向きはそのまま）
    if (!enemy.down) faceToward(enemy, player, dt);
    move(player, ix, iz, MOVE_SPEED * player.spd, dt);
    move(enemy, enemy.ix, enemy.iz, MOVE_SPEED * enemy.ai.speed * enemy.spd, dt);
    separate();
    physStep(player, enemy, dt);
    physStep(enemy, player, dt);
    attackUpdate(player, enemy, dt);
    attackUpdate(enemy, player, dt);
    if (state === 'fight' && (player.hp <= 0 || enemy.hp <= 0)){
      state = 'ending'; endT = END_WAIT;
      for (const f of [player, enemy]) if (f.hp <= 0){ f.down = true; f.fallV = FALL_KICK; f.guard = false; f.guardAmt = 0; }
      slowT = KO_SLOW_TIME; shake += KO_SHAKE;   // 決着の一撃はスローで見せる
      if (player.atk) endAttack(player, false);
      if (enemy.atk) endAttack(enemy, false);
    }
    if (state === 'ending'){ endT -= dt; if (endT <= 0) showResult(); }
  }

  function showResult(){ state = 'over'; }
  function updateHud(){}

  function applyStats(f, stats){
    f.power = stats.power; f.spd = stats.speed; f.def = stats.defense;
    f.hpMax = stats.maxHp; f.hp = stats.maxHp;
  }
  const aiFor = {
    beginner: CPU_TYPES[0], aggressive: CPU_TYPES[1], defensive: CPU_TYPES[2],
    retreating: CPU_TYPES[3], circling: CPU_TYPES[4],
  };

  function frame(dt){
    if(!player || !renderer) return;
    const rate = slowT > 0 ? KO_SLOW : 1;
    if(slowT > 0) slowT -= dt;
    if(hitStop > 0) hitStop -= dt;
    else {
      acc += dt * rate;
      while(acc >= STEP){ acc -= STEP; tick(STEP); if(hitStop > 0){ acc = 0; break; } }
    }
    if(state === 'intro') introUpdate(dt);
    updateCamera(dt, false);
    deform(player); deform(enemy);
    fxUpdate(dt * rate);
    renderer.render(scene, camera);
  }

  function begin(playerData, enemyData, playerStats, enemyStats, style){
    if(!renderer){ initThree(); initFx(); }
    resize3();
    if(fx){
      fxClear();
      for(const st of fx.dizzy.values()) st.forEach(m => { scene.remove(m); m.material.dispose(); });
      fx.dizzy.clear();
    }
    for(const f of [player, enemy]) if(f && f.trail){ scene.remove(f.trail.m); f.trail.geo.dispose(); }
    if(player) disposeFighter(player);
    if(enemy) disposeFighter(enemy);
    player = makeFighter(playerData, -1);
    enemy = makeFighter(enemyData, 1);
    startFight();
    applyStats(player, playerStats);
    applyStats(enemy, enemyStats);
    enemy.ai = aiFor[style] || CPU_TYPES[0];
    startIntro();
  }

  function destroy(){
    try{ if(fx) fxClear(); }catch{}
    try{ if(player) disposeFighter(player); }catch{}
    try{ if(enemy) disposeFighter(enemy); }catch{}
    player = enemy = null;
    if(renderer){ renderer.dispose(); renderer.forceContextLoss?.(); }
    renderer = null; scene = null; camera = null; fx = null;
  }

  return {
    keys,
    get jx(){ return jx; }, set jx(v){ jx = v; },
    get jy(){ return jy; }, set jy(v){ jy = v; },
    get defHeld(){ return defHeld; }, set defHeld(v){ defHeld = v; },
    attack(){ if(state === 'fight' && player && enemy) startAttack(player, enemy); },
    timeUp(){
      if(state !== 'fight' || !player || !enemy) return;
      if(player.hp === enemy.hp){ state = 'over'; return; }
      if(player.hp < enemy.hp) player.hp = 0; else enemy.hp = 0;
    },
    get state(){ return state; },
    get player(){ return player; },
    get enemy(){ return enemy; },
    begin, frame, resize: resize3, destroy,
  };
}
