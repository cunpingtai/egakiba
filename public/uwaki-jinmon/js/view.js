// 画面の形に合わせた視野（2026-10-26 オーナー「1-6進めて」の 1: スマホの縦持ち）。
// カメラの fov は縦の視野。縦長の画面では横の視野が狭くなりすぎる（夫の肩が切れ、判決のあとの場面は急須と腕で画面が埋まる）ので、
// 横:縦 が 1 より小さい時は、横:縦 = 1 の画面と同じ横の視野になるまで縦の視野を広げる。広がりすぎないように元の 1.45 倍まで
export function fitFov(fov, aspect) {
  if (!(aspect < 1)) return fov;
  const v = 2 * Math.atan(Math.tan(fov * Math.PI / 360) / aspect) * 180 / Math.PI;
  return Math.min(v, fov * 1.45);
}
