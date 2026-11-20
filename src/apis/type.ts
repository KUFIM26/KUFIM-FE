export type ApiResponse<T> = {
  success: boolean
  data: T
  error: { code: string; message: string } | null
}
export type AcceptingStatus = 'OPEN' | 'PAUSED' | 'CLOSED'
export type WaitingStatus =
  'WAITING' | 'CALLED' | 'ENTERED' | 'CANCELED' | 'AUTO_CANCELED' | 'NO_SHOW'
export type OrganizerType = 'STUDENT_COUNCIL' | 'COLLEGE' | 'CLUB' | 'INDIVIDUAL' | 'UNIVERSITY'
export type FacilityType =
  'CONTROL_ROOM' | 'RESTROOM' | 'ALCOHOL_SALES' | 'PHOTO_BOOTH' | 'SMOKING_AREA'
export type PerformanceType = 'BAND' | 'DANCE' | 'ARTIST' | 'OTHER'
export type NoticeCategory = 'URGENT' | 'PERFORMANCE' | 'SAFETY' | 'TRAFFIC' | 'INFO'
export type Pin = { xPercent: number; yPercent: number }
export type Festival = {
  festivalId: number
  name: string
  /** 영어 값. 서버가 영어 저장을 지원하기 전에는 필드 자체가 없다. */
  nameEn?: string | null
  location: string | null
  startAt: string
  endAt: string
  serverTime: string
  summary: {
    operatingBoothCount: number
    todayPerformanceCount: number
    stageEntrySummary: { stageId: number; entryStatus: 'OPEN' | 'RESTRICTED' }[]
  }
}
export type Stage = {
  stageId: number
  festivalId?: number
  name: string
  nameEn?: string | null
  entryStatus: 'OPEN' | 'RESTRICTED'
  displayOrder: number
  zones?: {
    zoneId: number
    displayOrder: number
    level: 'SMOOTH' | 'NORMAL' | 'CROWDED' | 'VERY_CROWDED' | null
    estimatedPeople: number | null
    updatedAt: string | null
  }[]
}
export type BoothDto = {
  boothId: number
  festivalId?: number
  name: string
  nameEn?: string | null
  placeEn?: string | null
  descriptionEn?: string | null
  organizerType: OrganizerType
  period: 'DAY' | 'NIGHT'
  place: string
  operatingHours: string | null
  description?: string | null
  waitingEnabled: boolean
  waitingTeamCount?: number | null
  estimatedWaitMinutes?: number | null
  waitingStatus?: AcceptingStatus | 'DISABLED'
  acceptingStatus?: AcceptingStatus
  pin: Pin | null
}
export type FacilityDto = {
  facilityId: number
  festivalId?: number
  type: FacilityType
  name: string
  nameEn?: string | null
  placeEn?: string | null
  description: string | null
  place: string
  operatingHours: string | null
  pin: Pin | null
}
export type PerformanceDto = {
  performanceId: number
  festivalId?: number
  title: string
  titleEn?: string | null
  descriptionEn?: string | null
  type: PerformanceType
  stageId: number
  stageName?: string
  stageNameEn?: string | null
  place?: string
  startAt: string
  endAt: string
  status?: 'PAST' | 'NOW' | 'NEXT'
  description?: string | null
  additionalDescription?: string | null
  castMembers?: string | null
  setlist?: string | null
}
export type NoticeDto = {
  noticeId: number
  title: string
  content: string
  titleEn?: string | null
  contentEn?: string | null
  category: NoticeCategory
  publishedAt: string
  unread?: boolean | null
}
export type Floorplan = {
  imageUrl: string
  /** 영어 지도. 서버가 아직 내려주지 않으면 프런트에 들어 있는 영어 지도로 대신한다. */
  imageUrlEn?: string | null
  width: number
  height: number
}
export type MapPin = Pin & {
  pinId: number
  targetType: 'BOOTH' | 'FACILITY' | 'STAGE'
  targetId: number
  name: string
}
export type Account = {
  accountId: number
  name: string
  role: 'SUPER_ADMIN' | 'BOOTH_ADMIN'
  managedBoothIds: number[]
}
export type WaitingInput = {
  studentNumber: string
  phoneNumber: string
  partySize: number
  privacyConsent: boolean
}
export type WaitingTicket = {
  waitingId: string
  boothId: number
  boothName: string
  waitingNumber: number
  partySize: number
  status: WaitingStatus
  aheadTeamCount: number
  position: number | null
  estimatedWaitMinutes: number
  registeredAt: string
  calledAt: string | null
  lastRecalledAt: string | null
  recallCount: number
  autoCancelAt: string | null
  closedAt: string | null
  closeReason: string | null
  serverTime: string
  smsStatus?: string
}
export type WaitingInfo = {
  boothId: number
  waitingEnabled: boolean
  acceptingStatus: AcceptingStatus
  effectiveWaitingStatus: AcceptingStatus | 'DISABLED'
  waitingTeamCount: number
  estimatedWaitMinutes: number
  myActiveWaitingId: string | null
}
export type WaitingConfig = {
  waitingEnabled: boolean
  acceptingStatus: AcceptingStatus
  estimateMinutesPerTeam: number
  autoCancelMinutes: number
}
export type QueueItem = WaitingTicket & {
  studentNumberMasked: string
  phoneNumberMasked: string
  elapsedMinutes: number
}
export type Queue = {
  content: QueueItem[]
  waitingTeamCount: number
  estimatedWaitMinutes: number
  acceptingStatus: AcceptingStatus
  serverTime: string
}
export type Notification = {
  notificationId: number
  type: 'NOTICE' | 'WAITING_CALL' | 'WAITING_AUTO_CANCELED' | 'REPORT_STATUS'
  title: string
  body: string
  createdAt: string
  readAt: string | null
  reportId?: number | null
  noticeId: number | null
  waitingId: string | null
}
export type NotificationPage = {
  content: Notification[]
  page: number
  totalPages: number
  totalElements: number
  unreadCount: number
}
export type NoticeInput = {
  title: string
  content: string
  category: NoticeCategory
  titleEn?: string | null
  contentEn?: string | null
}
export type BoothInput = {
  festivalId?: number
  name: string
  organizerType: OrganizerType
  period: 'DAY' | 'NIGHT'
  place: string
  description: string
  operatingHours: string
  waitingEnabled: boolean
  pin: Pin | null
  nameEn?: string | null
  placeEn?: string | null
  descriptionEn?: string | null
}
export type FacilityInput = {
  festivalId?: number
  type: FacilityType
  name: string
  description: string
  place: string
  operatingHours: string
  pin: Pin | null
  nameEn?: string | null
  placeEn?: string | null
}
export type PerformanceInput = {
  festivalId?: number
  stageId: number
  title: string
  type: PerformanceType
  description: string
  additionalDescription: string
  castMembers: string
  setlist: string
  startAt: string
  endAt: string
  titleEn?: string | null
  descriptionEn?: string | null
}
