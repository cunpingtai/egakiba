import { useState } from 'react'

export function UwakiCalc() {
  const [strong, setStrong] = useState(1)
  const [mid, setMid] = useState(0)
  const [weak, setWeak] = useState(0)
  const [recording, setRecording] = useState(false)
  const [coercion, setCoercion] = useState(false)
  let amount = 100 + strong * 60 + mid * 40 + weak * 15
  if (recording) amount *= 1.5
  if (coercion) amount *= recording ? 0.25 : 0.4
  amount = Math.max(0, amount)
  const shown = Math.round(amount)
  const good = amount >= 150 && !coercion
  return (
    <form className="uwaki-calc" onSubmit={(event) => event.preventDefault()}>
      <p className="uwaki-calc-note">ゲーム内慰謝料の計算です。現実の法律や示談には使えません。</p>
      <label>強い証拠で裏付けた自白<input type="number" min={0} max={6} value={strong} onChange={(event) => setStrong(clamp(event.target.value))} />件（+60万円）</label>
      <label>中くらいの証拠で裏付けた自白<input type="number" min={0} max={6} value={mid} onChange={(event) => setMid(clamp(event.target.value))} />件（+40万円）</label>
      <label>弱い証拠で裏付けた自白<input type="number" min={0} max={6} value={weak} onChange={(event) => setWeak(clamp(event.target.value))} />件（+15万円）</label>
      <label className="uwaki-calc-check"><input type="checkbox" checked={recording} onChange={(event) => setRecording(event.target.checked)} />録音がある（×1.5）</label>
      <label className="uwaki-calc-check"><input type="checkbox" checked={coercion} onChange={(event) => setCoercion(event.target.checked)} />責めすぎ（録音ありは×0.25、なしは×0.4）</label>
      <p className="uwaki-calc-result"><strong>{shown}万円</strong>{amount !== shown ? `（計算は${amount}万円）` : ''}。{good ? '150万円以上で、責めすぎではないので、離婚は良い結末です。' : 'この条件では、離婚は良い結末になりません。'}</p>
      <p className="uwaki-calc-note">100万円に、裏付けた自白ごとの加算を足します。1件につき一番強い証拠だけが入ります。</p>
    </form>
  )
}

function clamp(value: string) {
  const next = Number(value)
  if (!Number.isFinite(next)) return 0
  return Math.max(0, Math.min(6, Math.trunc(next)))
}
