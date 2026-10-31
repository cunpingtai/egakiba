import { useEffect, useRef, useState, type ReactNode } from 'react'

export function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const node = ref.current
    if (!node || node.open) return
    node.showModal()
    return () => {
      if (node.open) node.close()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      aria-labelledby="koi-dialog-title"
      className="m-auto h-fit max-h-[calc(100dvh-2rem)] w-[min(calc(100%-2rem),400px)] overflow-auto rounded-3xl border-0 bg-white p-6 text-[#2A2430] shadow-[0_12px_32px_rgba(42,36,48,0.10)] backdrop:bg-[rgba(42,36,48,0.4)]"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <h2 id="koi-dialog-title" className="text-balance text-xl font-semibold">{title}</h2>
      {children}
    </dialog>
  )
}
export function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export const primaryBtn = 'inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#B84D6A] px-6 text-base font-medium text-white transition-transform duration-100 ease-out hover:bg-[#A3415C] active:scale-[0.98] focus-visible:shadow-[0_0_0_3px_rgba(232,145,168,0.35)] focus-visible:outline-none disabled:pointer-events-none disabled:bg-[#E8E0E4] disabled:text-[#B0A8B0] sm:w-auto sm:min-w-52'

export const secondaryBtn = 'inline-flex min-h-12 items-center justify-center rounded-2xl border-[1.5px] border-[#E891A8] bg-white px-5 text-base font-medium text-[#B84D6A] hover:bg-[#FCE8EE] focus-visible:shadow-[0_0_0_3px_rgba(232,145,168,0.35)] focus-visible:outline-none'

export const ghostBtn = 'inline-flex min-h-11 items-center justify-center rounded-2xl px-3 text-base font-medium text-[#B84D6A] hover:bg-[#FCE8EE] focus-visible:shadow-[0_0_0_3px_rgba(232,145,168,0.35)] focus-visible:outline-none'

const eye = 'M34 54 L48 48 M64 48 L78 54'

export function Mascot({ mood = 'soft', className = 'size-52' }: { mood?: string; className?: string }) {
  const smile = mood === 'tsun'
    ? 'M40 86 Q56 76 72 86'
    : mood === 'spark' || mood === 'dere'
      ? 'M36 78 Q56 98 76 78'
      : 'M42 82 Q56 92 70 82'
  return (
    <svg className={className} viewBox="0 0 112 112" aria-hidden="true">
      <circle cx="56" cy="58" r="46" fill="#FFD6E0" />
      <circle cx="56" cy="56" r="40" fill="#FFF9F5" stroke="#2A2430" strokeWidth="2.5" />
      <circle cx="38" cy="66" r="6" fill="#F2A8BA" />
      <circle cx="74" cy="66" r="6" fill="#F2A8BA" />
      {mood === 'tsun' ? (
        <path d={eye} fill="none" stroke="#2A2430" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <>
          <circle cx="42" cy="52" r="3.2" fill="#2A2430" />
          <circle cx="70" cy="52" r="3.2" fill="#2A2430" />
        </>
      )}
      {mood === 'spark' ? <circle cx="78" cy="28" r="4" fill="#F2C14E" /> : null}
      <path d={smile} fill="none" stroke="#2A2430" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function RatioBar({ label, value, color }: { label: string; value: number; color: string }) {
  const width = Math.max(0, Math.min(100, value))
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(width))
    return () => cancelAnimationFrame(frame)
  }, [width])
  return (
    <div className="grid grid-cols-[4.5rem_1fr_3.25rem] items-center gap-3">
      <span className="text-sm text-[#6B6270]">{label}</span>
      <div className="h-3 overflow-hidden rounded-full bg-[#F5F0EB]">
        <div
          className="ks-motion h-full w-full origin-left rounded-full transition-transform duration-[700ms] ease-out motion-reduce:transition-none"
          style={{ background: color, transform: `scaleX(${shown / 100})` }}
        />
      </div>
      <span className="text-right text-base font-bold tabular-nums text-[#2A2430]">{width}%</span>
    </div>
  )
}
