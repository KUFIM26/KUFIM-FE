import { useEffect, useId, useRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { figmaAssets as assets } from '../data/figma-assets'

export function Asset({
  src,
  className = '',
  alt = '',
}: {
  src: string
  className?: string
  alt?: string
}) {
  return <img src={src} alt={alt} className={`icon-asset ${className}`} draggable={false} />
}
export function SectionTitle({ children, dot = false }: { children: ReactNode; dot?: boolean }) {
  return (
    <h2 className="flex items-center gap-1.5 text-base font-bold">
      <Asset src={dot ? assets['63:178'].imgEllipse4 : assets['17:303'].imgVector4} />
      {children}
    </h2>
  )
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>
}
export function Button({
  children,
  className = '',
  tone = 'green',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'green' | 'red' | 'gray' | 'blue' }) {
  const tones = {
    green: 'green-gradient',
    red: 'bg-danger',
    gray: 'bg-[#bcbcbc] !text-[#2a2a2a]',
    blue: 'bg-[#90c4ff] !text-[#00153b]',
  }
  return (
    <button type="button" className={`primary-button ${tones[tone]} ${className}`} {...props}>
      {children}
    </button>
  )
}
export type Option = { value: string; label: string; sublabel?: string }
export function Tabs({
  value,
  onChange,
  options,
  underline = false,
}: {
  value: string
  onChange: (value: string) => void
  options: Option[]
  underline?: boolean
}) {
  return (
    <div
      className={`flex ${underline ? 'gap-[30px] border-t border-[#e5e5e5] px-[11px]' : 'gap-2'}`}
      role="group"
      aria-label="보기 선택"
    >
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={
            underline
              ? `flex min-h-9 flex-1 items-center justify-center border-b-2 text-base font-bold ${value === option.value ? 'border-brand text-brand' : 'border-[#d9d9d9] text-[#464646]'}`
              : `flex min-h-[46px] flex-1 flex-col items-center justify-center rounded-xl px-1 py-3 font-bold ${value === option.value ? 'bg-brand text-white shadow-card' : 'bg-[#e5e5e5] text-[#464646]'}`
          }
        >
          <span className={underline ? '' : 'text-lg'}>{option.label}</span>
          {option.sublabel && <span className="mt-1 text-[10px]">{option.sublabel}</span>}
        </button>
      ))}
    </div>
  )
}
export function Chips({
  options,
  value,
  onChange,
  compact = false,
}: {
  options: string[]
  value: string
  onChange: (value: string) => void
  compact?: boolean
}) {
  return (
    <div
      className="hide-scrollbar flex min-w-0 gap-2 overflow-x-auto pb-0.5"
      role="group"
      aria-label="카테고리 선택"
    >
      {options.map((option) => (
        <button
          type="button"
          key={option}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={`shrink-0 rounded-full font-semibold ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-sm shadow-[1px_1px_1px_rgba(0,0,0,.1)]'} ${value === option ? 'bg-brand text-white' : 'bg-[#eee] text-[#383838]'}`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
export function EmptyState({ children = '등록된 항목이 없어요.' }: { children?: ReactNode }) {
  return (
    <div role="status" className="rounded-xl bg-white px-5 py-10 text-center text-sm text-muted">
      {children}
    </div>
  )
}
export function BackToList({
  to,
  children = '목록으로 돌아가기',
}: {
  to: string
  children?: ReactNode
}) {
  return (
    <Link to={to} className="primary-button green-gradient">
      {children}
    </Link>
  )
}
export function ConfirmDialog({
  open,
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel = '취소하기',
  cancelLabel = '유지하기',
  admin = false,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  onConfirm: () => void
  confirmLabel?: string
  cancelLabel?: string
  admin?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal()
    else if (!open) ref.current?.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      className="confirm-dialog"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <h2 id={id} className="text-center text-xl font-bold">
        {title}
      </h2>
      <div className="my-3 text-center text-sm">{children}</div>
      <div className="flex justify-center gap-3">
        <Button
          tone="red"
          className={`!min-h-10 !w-[132px] !py-2 !text-base ${admin ? '!bg-[#ffa3a3] !text-[#3b0500]' : ''}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
        <Button
          tone={admin ? 'blue' : 'green'}
          className="!min-h-10 !w-[132px] !py-2 !text-base"
          onClick={onClose}
        >
          {cancelLabel}
        </Button>
      </div>
    </dialog>
  )
}
