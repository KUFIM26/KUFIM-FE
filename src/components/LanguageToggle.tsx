import { useTranslation } from 'react-i18next'
import { languages, setLanguage } from '../i18n'

/** KO / EN 전환. 고른 언어는 기기에 저장된다. */
export function LanguageToggle({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation()
  return (
    <div
      role="group"
      aria-label={t('common.switchLanguage')}
      className={`flex shrink-0 items-center rounded-full bg-[#f3f3f3] p-0.5 text-[11px] font-bold ${className}`}
    >
      {languages.map((language) => (
        <button
          key={language}
          type="button"
          lang={language}
          aria-pressed={i18n.language === language}
          onClick={() => setLanguage(language)}
          className={`rounded-full px-2 py-1.5 leading-none ${i18n.language === language ? 'bg-brand text-white' : 'text-[#6b6b6b]'}`}
        >
          {language.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
