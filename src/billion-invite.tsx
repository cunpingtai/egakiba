const HREF = 'https://1in8billion.app/'

export function BillionInvite({ placement }: { placement: 'bar' | 'hero' }) {
  const hero = placement === 'hero'
  return (
    <a
      className={hero ? 'billion-invite billion-hero' : 'billion-invite'}
      href={HREF}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="billion-seal" aria-hidden="true">1</span>
      <span className="billion-copy">
        {hero ? <span className="billion-kicker">生まれた国は、抽選で決まる</span> : null}
        <strong>80億分の1 ゲーム</strong>
        {hero ? <span className="billion-hook">172か国のどこかで生まれ、渡された一生を最後まで生きる。</span> : <span className="billion-hook">国は抽選</span>}
      </span>
      <span className="billion-go" aria-hidden="true">{hero ? '生きてみる' : '開く'}</span>
    </a>
  )
}
