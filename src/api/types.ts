// Response shapes of KUFIM-BE (/api/v1). Times are ISO strings with the +09:00 offset.
export type AcceptingStatus = 'OPEN' | 'PAUSED' | 'CLOSED'
export type WaitingStatus =
  'WAITING' | 'CALLED' | 'ENTERED' | 'CANCELED' | 'AUTO_CANCELED' | 'NO_SHOW'
export type OrganizerType = 'STUDENT_COUNCIL' | 'COLLEGE' | 'CLUB' | 'INDIVIDUAL' | 'UNIVERSITY'
export type FacilityType =
  'CONTROL_ROOM' | 'RESTROOM' | 'ALCOHOL_SALES' | 'PHOTO_BOOTH' | 'SMOKING_AREA'
export type NoticeCategory = 'URGENT' | 'PERFORMANCE' | 'SAFETY' | 'TRAFFIC' | 'INFO'
export type PerformanceType = 'BAND' | 'DANCE' | 'ARTIST' | 'OTHER'
export type Pin = { xPercent: number; yPercent: number } | null

export type ApiFestival = {
  festivalId: number
  name: string
  location: string | null
  startAt: string
  endAt: string
  status: string
  serverTime: string
  summary: {
    operatingBoothCount: number
    todayPerformanceCount: number
    stageEntrySummary: { stageId: number; entryStatus: string }[]
  }
}
export type ApiFloorplan = { imageUrl: string; width: number; height: number }
export type CongestionLevel = 'SMOOTH' | 'NORMAL' | 'CROWDED' | 'VERY_CROWDED'
export type ApiZone = {
  zoneId: number
  stageId: number
  name: string
  displayOrder: number
  level: CongestionLevel | null
  estimatedPeople: number | null
  updatedAt: string | null
}
export type ApiAdminZone = ApiZone & { active: boolean; recordedBy: string | null }
export type ApiStage = {
  stageId: number
  name: string
  entryStatus: string
  displayOrder: number
  // Active zones with their latest congestion, and the server clock for the 15-minute check.
  zones?: ApiZone[]
  serverTime?: string
}
export type ApiPerformance = {
  performanceId: number
  title: string
  type: PerformanceType
  stageId: number
  stageName: string
  place: string
  startAt: string
  endAt: string
  status: 'PAST' | 'NOW' | 'NEXT'
  description?: string | null
  additionalDescription?: string | null
  castMembers?: string | null
  setlist?: string | null
}
export type ApiBooth = {
  boothId: number
  name: string
  organizerType: OrganizerType
  period: 'DAY' | 'NIGHT'
  place: string | null
  operatingHours: string | null
  waitingEnabled: boolean
  waitingStatus: AcceptingStatus | 'DISABLED'
  // Present in list responses; null when the booth does not use waiting.
  waitingTeamCount?: number | null
  estimatedWaitMinutes?: number | null
  pin: Pin
  description?: string | null
  myActiveWaitingId?: string | null
}
export type ApiFacility = {
  facilityId: number
  type: FacilityType
  name: string
  description: string | null
  place: string | null
  operatingHours: string | null
  pin: Pin
}
export type ApiNotice = {
  noticeId: number
  title: string
  content: string
  category: NoticeCategory
  publishedAt: string
  unread: boolean | null
}
export type ApiNotification = {
  notificationId: number
  type: 'NOTICE' | 'WAITING_CALL' | 'WAITING_AUTO_CANCELED' | string
  title: string
  body: string
  createdAt: string
  readAt: string | null
  noticeId: number | null
  waitingId: string | null
}
export type ApiNotificationPage = {
  content: ApiNotification[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  unreadCount: number
}
export type ApiWaitingStatus = {
  boothId: number
  waitingEnabled: boolean
  acceptingStatus: AcceptingStatus
  effectiveWaitingStatus: AcceptingStatus | 'DISABLED'
  waitingTeamCount: number
  estimatedWaitMinutes: number
  estimationAvailable: boolean
  myActiveWaitingId: string | null
  serverTime: string
}
export type ApiTicket = {
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
export type ApiAdminTicket = ApiTicket & {
  studentNumberMasked: string
  phoneNumberMasked: string
  elapsedMinutes: number
}
export type ApiAdminQueue = {
  summary: {
    waiting: number
    called: number
    enteredToday: number
    autoCanceledToday: number
    canceledToday: number
  }
  waitingTeamCount: number
  estimatedWaitMinutes: number
  acceptingStatus: AcceptingStatus
  content: ApiAdminTicket[]
  serverTime: string
}
export type ApiWaitingConfig = {
  waitingEnabled: boolean
  acceptingStatus: AcceptingStatus
  estimateMinutesPerTeam: number
  autoCancelMinutes: number
}
export type ApiAdminAccount = {
  accountId: number
  name: string
  role: 'SUPER_ADMIN' | 'BOOTH_ADMIN'
  managedBoothIds: number[]
}
export type WaitingCreateInput = {
  studentNumber: string
  phoneNumber: string
  partySize: number
  privacyConsent: true
}

// Admin content inputs (AdminCatalogApiController records). PATCH accepts any subset.
export type PinInput = { xPercent: number; yPercent: number }
export type NoticeInput = { title: string; content: string; category: NoticeCategory }
export type PerformanceInput = {
  festivalId: number
  stageId: number
  title: string
  type: PerformanceType
  description: string
  additionalDescription: string
  castMembers: string
  setlist: string
  startAt: string
  endAt: string
}
export type BoothInput = {
  festivalId: number
  name: string
  organizerType: OrganizerType
  period: 'DAY' | 'NIGHT'
  place: string
  description: string
  operatingHours: string
  waitingEnabled: boolean
  pin?: PinInput
}
export type FacilityInput = {
  festivalId: number
  type: FacilityType
  name: string
  description: string
  place: string
  operatingHours: string
  pin?: PinInput
}
