import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { ko } from './ko'
import { en } from './en'

export type Language = 'ko' | 'en'
export const languages: Language[] = ['ko', 'en']
const STORAGE_KEY = 'kufim.lang'

/** 방문자가 고른 언어. 고른 적이 없으면 기기 언어가 한국어일 때만 한국어, 아니면 영어. */
export function preferredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'ko' || stored === 'en') return stored
  } catch {
    // 저장소를 못 쓰는 환경에서는 기기 언어만 본다.
  }
  return navigator.language?.toLowerCase().startsWith('ko') ? 'ko' : 'en'
}
/** 관리자 화면은 항상 한국어다. 방문자 화면으로 나오면 고른 언어로 돌아간다. */
export const languageFor = (pathname: string): Language =>
  pathname === '/admin' || pathname.startsWith('/admin/') ? 'ko' : preferredLanguage()

export function applyLanguage(language: Language) {
  document.documentElement.lang = language
  if (i18n.language !== language) void i18n.changeLanguage(language)
}
export function setLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // 저장하지 못해도 이번 방문 동안은 바뀐 언어로 보여준다.
  }
  applyLanguage(language)
}

void i18n.use(initReactI18next).init({
  resources: { ko: { translation: ko }, en: { translation: en } },
  lng: languageFor(location.pathname),
  fallbackLng: 'ko',
  interpolation: { escapeValue: false },
  // 문구를 번들에 넣었으므로 첫 화면부터 바로 번역된 채로 그린다.
  initAsync: false,
})
document.documentElement.lang = i18n.language

export default i18n
