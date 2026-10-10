import type { Option } from '../components/ui'
import type { Booth, Notice, Performance } from '../data/mock'
import type {
  ApiBooth,
  ApiFacility,
  ApiFestival,
  ApiNotice,
  ApiPerformance,
  ApiStage,
  FacilityType,
  NoticeCategory,
  OrganizerType,
  PerformanceType,
} from './types'

export const organizerLabels: Record<OrganizerType, string> = {
  STUDENT_COUNCIL: '총학생회',
  COLLEGE: '단과대학',
  CLUB: '동아리',
  INDIVIDUAL: '개인',
  UNIVERSITY: '학교본부',
}
export const facilityLabels: Record<FacilityType, string> = {
  CONTROL_ROOM: '상황실',
  RESTROOM: '화장실',
  ALCOHOL_SALES: '주류판매',
  PHOTO_BOOTH: '포토부스',
  SMOKING_AREA: '흡연구역',
}
export const noticeLabels: Record<NoticeCategory, string> = {
  URGENT: '긴급',
  PERFORMANCE: '공연',
  SAFETY: '안전',
  TRAFFIC: '교통',
  INFO: '안내',
}
export const performanceLabels: Record<PerformanceType, string> = {
  BAND: '밴드',
  DANCE: '댄스',
  ARTIST: '아티스트',
  OTHER: '기타',
}
// Reverse lookup for form values, e.g. fromLabel(noticeLabels, '긴급') === 'URGENT'.
export function fromLabel<K extends string>(labels: Record<K, string>, label: string): K {
  const key = (Object.keys(labels) as K[]).find((k) => labels[k] === label)
  if (!key) throw new Error(`알 수 없는 분류입니다: ${label}`)
  return key
}
// "HH:mm" on a festival date, as the +09:00 offset time the backend expects.
export const toOffsetTime = (date: string, time: string) => `${date}T${time}:00+09:00`

const weekdays = ['일', '월', '화', '수', '목', '금', '토']
const pad = (value: number) => String(value).padStart(2, '0')

// Festival times are Korean local time regardless of the viewer's device zone.
export function kst(iso: string) {
  const shifted = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000)
  return {
    date: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: weekdays[shifted.getUTCDay()],
    time: `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`,
  }
}
export const formatDateTime = (iso: string) => {
  const t = kst(iso)
  return `${pad(t.month)}.${pad(t.day)}. ${t.time}`
}
export const formatFullDateTime = (iso: string) => {
  const t = kst(iso)
  return `${t.date.replaceAll('-', '.')}. ${t.time}`
}
export const minutesBetween = (from: string, to: string) =>
  Math.max(0, Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 60000))

export function toBooth(item: ApiBooth): Booth {
  return {
    id: String(item.boothId),
    name: item.name,
    category: organizerLabels[item.organizerType] ?? item.organizerType,
    period: item.period === 'NIGHT' ? 'night' : 'day',
    place: item.place ?? '',
    hours: item.operatingHours ?? '',
    description: item.description ?? '',
    position: item.pin ? { x: item.pin.xPercent, y: item.pin.yPercent } : undefined,
    waitingEnabled: item.waitingEnabled,
    waitingStatus: item.waitingStatus,
    teams: item.waitingTeamCount ?? undefined,
    minutes: item.estimatedWaitMinutes ?? undefined,
  }
}

// Facilities share the booth list UI, so their IDs are prefixed to stay distinct from booth IDs.
export const facilityId = (id: number) => `facility-${id}`
export function toFacility(item: ApiFacility): Booth {
  return {
    id: facilityId(item.facilityId),
    name: item.name,
    category: facilityLabels[item.type] ?? item.type,
    period: 'facility',
    place: item.place ?? '',
    hours: item.operatingHours ?? '',
    description: item.description ?? '',
    position: item.pin ? { x: item.pin.xPercent, y: item.pin.yPercent } : undefined,
  }
}

export function toNotice(item: ApiNotice): Notice {
  return {
    id: String(item.noticeId),
    title: item.title,
    category: noticeLabels[item.category] ?? item.category,
    date: formatDateTime(item.publishedAt),
    body: item.content,
    unread: item.unread ?? false,
  }
}

// Day tabs follow the festival period; without a festival, they follow the scheduled dates.
export function toDayOptions(
  festival: ApiFestival | null,
  performances: ApiPerformance[],
): Option[] {
  const dates = new Map<string, ReturnType<typeof kst>>()
  if (festival) {
    const end = kst(festival.endAt).date
    for (let t = new Date(festival.startAt).getTime(); ; t += 24 * 60 * 60 * 1000) {
      const day = kst(new Date(t).toISOString())
      if (day.date > end) break
      dates.set(day.date, day)
    }
  } else {
    performances.forEach((p) => {
      const day = kst(p.startAt)
      dates.set(day.date, day)
    })
  }
  return [...dates.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d, i) => ({
      value: String(i + 1),
      label: `DAY ${i + 1}`,
      sublabel: `${d.month}월 ${pad(d.day)}일 (${d.weekday})`,
      date: d.date,
    }))
}

export const toStageOptions = (stages: ApiStage[]): Option[] =>
  [...stages]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((s) => ({ value: String(s.stageId), label: s.name }))

export function toPerformance(item: ApiPerformance, days: Option[]): Performance {
  const start = kst(item.startAt)
  return {
    id: String(item.performanceId),
    name: item.title,
    day: days.find((d) => d.date === start.date)?.value ?? '',
    stage: String(item.stageId),
    stageName: item.stageName,
    time: start.time,
    end: kst(item.endAt).time,
    place: item.place,
    kind: performanceLabels[item.type] ?? item.type,
    status: item.status.toLowerCase() as Performance['status'],
    description: item.description ?? '',
    additionalDescription: item.additionalDescription ?? undefined,
    cast: item.castMembers ?? '',
    setlist: item.setlist ?? '',
  }
}
