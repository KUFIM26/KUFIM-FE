import { useCallback, useEffect, useRef, useState } from 'react'
import { translateToEnglish } from '../apis/translate'

/**
 * 한국어 입력칸 아래에 두는 영어 입력칸. 한국어 칸에서 벗어났을 때 영어가 비어 있으면
 * 자동 번역으로 채우고, 운영진이 고친 영어는 "다시 번역"을 누르기 전까지 덮어쓰지 않는다.
 * 같은 form 안에서 source 이름의 한국어 칸을 찾아 쓴다.
 */
export function EnglishField({
  name,
  source,
  label,
  defaultValue = '',
  maxLength,
  multiline = false,
}: {
  name: string
  source: string
  label: string
  defaultValue?: string
  maxLength: number
  multiline?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState(defaultValue)
  const [state, setState] = useState<'idle' | 'busy' | 'failed'>('idle')
  const translate = useCallback(
    async (force: boolean) => {
      const field = input.current ?? area.current
      const korean = field?.form?.elements.namedItem(source)
      const original =
        korean instanceof HTMLInputElement || korean instanceof HTMLTextAreaElement
          ? korean.value.trim()
          : ''
      if (!original || (!force && field?.value.trim())) return
      setState('busy')
      try {
        const [english] = await translateToEnglish([original])
        setText(english || '')
        setState('idle')
      } catch {
        setState('failed')
      }
    },
    [source],
  )
  useEffect(() => {
    const korean = (input.current ?? area.current)?.form?.elements.namedItem(source)
    if (!(korean instanceof HTMLElement)) return
    const onBlur = () => void translate(false)
    korean.addEventListener('blur', onBlur)
    return () => korean.removeEventListener('blur', onBlur)
  }, [source, translate])
  const tooLong = text.length > maxLength
  // 번역 결과는 길이 제한을 넘을 수 있다. 넘으면 저장을 막고 줄이도록 안내한다.
  useEffect(() => {
    ;(input.current ?? area.current)?.setCustomValidity(
      tooLong ? `영어는 ${maxLength}자 이내로 줄여 주세요.` : '',
    )
  }, [tooLong, maxLength])
  const props = {
    name,
    'data-english-source': source,
    value: text,
    'aria-label': label,
    placeholder: state === 'busy' ? '번역 중…' : `${label} (선택, ${maxLength}자 이내)`,
    onChange: (event: { target: { value: string } }) => setText(event.target.value),
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs font-semibold text-[#6b6b6b]">
        <span lang="en">EN · {label}</span>
        <button
          type="button"
          className="font-bold text-brand underline disabled:opacity-50"
          disabled={state === 'busy'}
          onClick={() => void translate(true)}
        >
          다시 번역
        </button>
      </div>
      {multiline ? (
        <textarea ref={area} lang="en" className="form-control min-h-[100px] resize-y" {...props} />
      ) : (
        <input ref={input} lang="en" className="form-control" {...props} />
      )}
      {tooLong && (
        <p role="alert" className="text-xs text-danger">
          영어가 {text.length}자입니다. {maxLength}자 이내로 줄여 주세요.
        </p>
      )}
      {state === 'failed' && (
        <p role="status" className="text-xs text-muted">
          자동 번역을 사용할 수 없습니다. 영어를 직접 입력해 주세요.
        </p>
      )}
    </div>
  )
}
