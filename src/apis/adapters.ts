import type { BoothDto, FacilityDto, PerformanceDto, NoticeDto, Festival, Stage } from './type'
import type { Booth, Performance, Notice } from '../data/models'
import i18n from '../i18n'
export const organizerLabels = {
  STUDENT_COUNCIL: '총학생회',
  COLLEGE: '단과대학',
  CLUB: '동아리',
  INDIVIDUAL: '개인',
  UNIVERSITY: '학교본부',
} as const
export const facilityLabels = {
  CONTROL_ROOM: '상황실',
  RESTROOM: '화장실',
  ALCOHOL_SALES: '주류판매',
  PHOTO_BOOTH: '포토부스',
  SMOKING_AREA: '흡연구역',
} as const
export const performanceLabels = {
  BAND: '밴드',
  DANCE: '댄스',
  ARTIST: '아티스트',
  OTHER: '기타',
} as const
export const noticeLabels = {
  URGENT: '긴급',
  PERFORMANCE: '공연',
  SAFETY: '안전',
  TRAFFIC: '교통',
  INFO: '안내',
} as const
export const acceptingLabels = {
  OPEN: '운영 중',
  PAUSED: '대기 마감',
  CLOSED: '운영 종료',
} as const
export const waitingLabels = {
  WAITING: '대기 중',
  CALLED: '호출됨',
  ENTERED: '입장 완료',
  CANCELED: '취소됨',
  AUTO_CANCELED: '자동 취소',
  NO_SHOW: '노쇼',
} as const
export function codeFor<T extends string>(labels: Record<T, string>, label: string): T {
  const entry = (Object.entries(labels) as [T, string][]).find(([, v]) => v === label)
  if (!entry) throw new Error('분류를 선택해주세요.')
  return entry[0]
}
export const dateText = (value: string) =>
  new Date(value).toLocaleString(i18n.language === 'ko' ? 'ko-KR' : 'en-US', {
    timeZone: 'Asia/Seoul',
  })
export const seoulDate = (value: string) =>
  new Date(value).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
const time = (value: string) =>
  new Date(value).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
  })
export function festivalDays(festival: Festival | null) {
  if (!festival) return []
  const start = new Date(`${seoulDate(festival.startAt)}T00:00:00Z`).getTime()
  const end = new Date(`${seoulDate(festival.endAt)}T00:00:00Z`).getTime()
  return Array.from(
    { length: Math.min(366, Math.max(1, Math.round((end - start) / 86400000) + 1)) },
    (_, i) => new Date(start + i * 86400000).toISOString().slice(0, 10),
  )
}
export function performanceDays(festival: Festival | null, performances: Performance[]) {
  return [...new Set([...festivalDays(festival), ...performances.map((p) => p.day)])].sort()
}
/** 영어 화면에서 영어 값이 있으면 영어, 없으면 한국어 원문을 쓴다. */
export const localized = (korean: string, english?: string | null) =>
  i18n.language === 'en' && english ? english : korean
export function boothView(b: BoothDto): Booth {
  return {
    id: String(b.boothId),
    apiId: b.boothId,
    festivalId: b.festivalId,
    name: localized(b.name, b.nameEn),
    ko: { name: b.name, place: b.place, description: b.description || '' },
    en: { name: b.nameEn || '', place: b.placeEn || '', description: b.descriptionEn || '' },
    category: organizerLabels[b.organizerType],
    period: b.period === 'DAY' ? 'day' : 'night',
    place: localized(b.place, b.placeEn),
    hours: b.operatingHours || '',
    description: localized(b.description || '', b.descriptionEn),
    waitingEnabled: b.waitingEnabled,
    teams: b.waitingEnabled ? (b.waitingTeamCount ?? undefined) : undefined,
    minutes: b.waitingEnabled ? (b.estimatedWaitMinutes ?? undefined) : undefined,
    waitingStatus: b.waitingStatus || b.acceptingStatus,
    position: b.pin ? { x: b.pin.xPercent, y: b.pin.yPercent } : undefined,
  }
}
export function facilityView(f: FacilityDto): Booth {
  return {
    id: `facility-${f.facilityId}`,
    apiId: f.facilityId,
    festivalId: f.festivalId,
    name: localized(f.name, f.nameEn),
    ko: { name: f.name, place: f.place, description: f.description || '' },
    en: { name: f.nameEn || '', place: f.placeEn || '', description: '' },
    category: facilityLabels[f.type],
    period: 'facility',
    place: localized(f.place, f.placeEn),
    hours: f.operatingHours || '',
    description: f.description || '',
    position: f.pin ? { x: f.pin.xPercent, y: f.pin.yPercent } : undefined,
  }
}
export function performanceView(p: PerformanceDto, stages: Stage[]): Performance {
  const stage = stages.find((s) => s.stageId === p.stageId)
  return {
    id: String(p.performanceId),
    apiId: p.performanceId,
    festivalId: p.festivalId,
    name: localized(p.title, p.titleEn),
    ko: { name: p.title, description: p.description || '' },
    en: { name: p.titleEn || '', description: p.descriptionEn || '' },
    day: seoulDate(p.startAt),
    date: seoulDate(p.startAt),
    stage: String(p.stageId),
    time: time(p.startAt),
    end: time(p.endAt),
    place: localized(p.stageName || stage?.name || '', p.stageNameEn || stage?.nameEn),
    kind: performanceLabels[p.type],
    status: p.status?.toLowerCase() as Performance['status'],
    description: localized(p.description || '', p.descriptionEn),
    additionalDescription: p.additionalDescription || '',
    cast: p.castMembers || '',
    setlist: p.setlist || '',
  }
}
export function noticeView(n: NoticeDto): Notice {
  const day = seoulDate(n.publishedAt)
  return {
    id: String(n.noticeId),
    title: localized(n.title, n.titleEn),
    body: localized(n.content, n.contentEn),
    ko: { title: n.title, body: n.content },
    en: { title: n.titleEn || '', body: n.contentEn || '' },
    category: noticeLabels[n.category],
    date: `${day.slice(5).replace('-', '.')}. ${time(n.publishedAt)}`,
    unread: n.unread === true,
  }
}
