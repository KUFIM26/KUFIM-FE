export type Booth = {
  id: string
  apiId: number
  festivalId?: number
  name: string
  category: string
  waitingEnabled?: boolean
  waitingStatus?: string
  period: 'day' | 'night' | 'facility'
  place: string
  hours: string
  description: string
  teams?: number
  minutes?: number
  position?: { x: number; y: number }
  /** 관리자 수정 화면용 영어 원본. 화면 표시에는 name·place·description(현재 언어)을 쓴다. */
  en?: { name: string; place: string; description: string }
  /** 한국어 원본. 영어 화면에서 name 등이 영어로 바뀌어도 수정 화면은 이 값을 쓴다. */
  ko?: { name: string; place: string; description: string }
}
export type Performance = {
  apiId: number
  festivalId?: number
  date: string
  id: string
  name: string
  day: string
  stage: string
  time: string
  end: string
  place: string
  kind: string
  status?: 'past' | 'now' | 'next'
  description: string
  additionalDescription?: string
  cast: string
  setlist: string
  en?: { name: string; description: string }
  ko?: { name: string; description: string }
}
export type Notice = {
  id: string
  title: string
  category: string
  date: string
  body: string
  unread?: boolean
  notificationUnread?: boolean
  en?: { title: string; body: string }
  ko?: { title: string; body: string }
}
export const boothCategories = ['전체', '총학생회', '단과대학', '동아리', '개인', '학교본부']
export const facilities = ['상황실', '화장실', '주류판매', '포토부스', '흡연구역']
export const noticeCategories = ['전체', '공연', '안전', '교통', '안내']
