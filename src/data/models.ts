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
}
export type Notice = {
  id: string
  title: string
  category: string
  date: string
  body: string
  unread?: boolean
  notificationUnread?: boolean
}
export const boothCategories = ['전체', '총학생회', '단과대학', '동아리', '개인', '학교본부']
export const facilities = ['상황실', '화장실', '주류판매', '포토부스', '흡연구역']
export const noticeCategories = ['전체', '공연', '안전', '교통', '안내']
