import { useTranslation } from 'react-i18next'

/**
 * 분류·상태 이름을 현재 언어로 바꾼다. 코드 곳곳에서 한국어 이름을 내부 키(주소 조건, 필터 비교)로
 * 쓰고 있으므로 값은 그대로 두고, 화면에 그릴 때만 이 함수로 바꾼다. 번역이 없으면 원문을 돌려준다.
 */
export function useLabel() {
  const { t } = useTranslation()
  return (korean: string) => t(`labels.${korean}`, { defaultValue: korean })
}
