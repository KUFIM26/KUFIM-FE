import api from './axios'
import type { ApiResponse } from './type'

/** 한국어 → 영어 자동 번역. 번역 서비스 키를 프런트에 둘 수 없어 서버가 대신 호출한다. */
export async function translateToEnglish(texts: string[]) {
  const response = await api.post<ApiResponse<{ translations: string[] }>>('/admin/translate', {
    texts,
    target: 'EN',
  })
  return response.data.data.translations
}

type TextField = HTMLInputElement | HTMLTextAreaElement
const isTextField = (node: unknown): node is TextField =>
  node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement

/**
 * 저장 직전에 부른다. 한국어는 있는데 영어가 아직 비어 있는 칸(마지막 칸을 쓰고 바로 저장을 누른 경우)을
 * 한 번에 번역해 { 영어 칸 이름: 번역 } 으로 돌려준다. 번역에 실패하면 빈 객체를 돌려줘 저장을 막지 않는다.
 */
export async function missingEnglish(form: HTMLFormElement) {
  const targets = [...form.querySelectorAll<TextField>('[data-english-source]')].flatMap(
    (field) => {
      const korean = form.elements.namedItem(field.dataset.englishSource || '')
      const original = isTextField(korean) ? korean.value.trim() : ''
      return original && !field.value.trim() ? [{ name: field.name, original }] : []
    },
  )
  if (!targets.length) return {}
  try {
    const translations = await translateToEnglish(targets.map((target) => target.original))
    return Object.fromEntries(
      targets.flatMap((target, index) =>
        translations[index] ? [[target.name, translations[index]]] : [],
      ),
    ) as Record<string, string>
  } catch {
    return {}
  }
}
