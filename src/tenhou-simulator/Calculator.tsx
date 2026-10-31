import { useMemo, useState } from 'react'

const RATE = 1 / 330000
const PRESETS = [10000, 100000, 228700, 330000, 500000, 1000000, 1500000]

function atLeastOnce(n: number) {
  if (n <= 0) return 0
  return 1 - Math.exp(n * Math.log(1 - RATE))
}

function formatPercent(value: number) {
  const percent = value * 100
  if (percent >= 1) return `${percent.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
  if (percent >= 0.01) return `${percent.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
  return `${percent.toLocaleString('ja-JP', { maximumFractionDigits: 6 })}%`
}

export function TenhouCalculator() {
  const [raw, setRaw] = useState('330000')
  const count = useMemo(() => {
    const digits = raw.replace(/[^\d]/g, '')
    if (!digits) return 0
    return Math.min(Number(digits), 100000000)
  }, [raw])
  const hit = atLeastOnce(count)
  const miss = 1 - hit

  return (
    <form className="tenhou-calc" onSubmit={event => event.preventDefault()}>
      <label htmlFor="tenhou-count">配牌の回数</label>
      <input
        id="tenhou-count"
        inputMode="numeric"
        value={raw}
        onChange={event => setRaw(event.target.value)}
      />
      <div className="tenhou-calc-presets">
        {PRESETS.map(preset => (
          <button key={preset} type="button" onClick={() => setRaw(String(preset))}>
            {preset.toLocaleString('ja-JP')}回
          </button>
        ))}
      </div>
      <p className="tenhou-calc-result">
        <span>{count.toLocaleString('ja-JP')}回までに1回以上出る理論確率</span>
        <strong>{formatPercent(hit)}</strong>
      </p>
      <p className="tenhou-calc-result">
        <span>1回も出ない理論確率</span>
        <strong>{formatPercent(miss)}</strong>
      </p>
      <style>{`
        .tenhou-calc { margin: 8px 0 20px; padding: 16px; background: #fffdf8; border: 2px solid #27364e; border-radius: 16px; box-shadow: 3px 3px 0 #27364e; }
        .tenhou-calc label { display: block; font-weight: 800; margin-bottom: 8px; }
        .tenhou-calc input { width: 100%; min-height: 48px; padding: 0 12px; border: 2px solid #27364e; border-radius: 12px; font: inherit; font-size: 22px; font-weight: 800; }
        .tenhou-calc-presets { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
        .tenhou-calc-presets button { min-height: 40px; padding: 0 12px; border: 2px solid #27364e; border-radius: 999px; background: #fffdf8; font: inherit; font-weight: 800; cursor: pointer; }
        .tenhou-calc-result { display: flex; justify-content: space-between; gap: 12px; margin: 8px 0; }
        .tenhou-calc-result strong { font-size: 22px; }
      `}</style>
    </form>
  )
}
