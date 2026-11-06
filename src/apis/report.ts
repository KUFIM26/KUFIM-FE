import api from './axios'
import type { ApiResponse } from './type'

export type ReportStatus = 'SUBMITTED' | 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED'
export type ReportCategory = 'SAFETY' | 'LOST_ITEM' | 'FACILITY' | 'OTHER'
export type ReportInput = {
  category: ReportCategory
  title: string
  reporterName: string
  phoneNumber: string
  place: string
  content: string
  privacyConsent: boolean
}
export type Report = Omit<ReportInput, 'privacyConsent' | 'phoneNumber'> & {
  reportId: number
  status: ReportStatus
  createdAt: string
  receivedAt: string | null
  inProgressAt: string | null
  completedAt: string | null
  adminNote: string | null
  phoneNumberMasked?: string
  elapsedMinutes?: number
  smsStatus?: string
  statusChanged?: boolean
}
export type ReportList = {
  content: Report[]
  page: number
  totalPages: number
  totalElements: number
  summary: {
    submitted: number
    received: number
    inProgress: number
    completed: number
    canceled: number
  }
}
export const reportLabels: Record<ReportStatus, string> = {
  SUBMITTED: '신청',
  RECEIVED: '접수',
  IN_PROGRESS: '처리 중',
  COMPLETED: '완료',
  CANCELED: '취소',
}
export const reportCategories: Record<ReportCategory, string> = {
  SAFETY: '안전사고',
  LOST_ITEM: '분실물',
  FACILITY: '시설불편',
  OTHER: '기타',
}
export const reportSteps: ReportStatus[] = ['SUBMITTED', 'RECEIVED', 'IN_PROGRESS', 'COMPLETED']
async function unwrap<T>(request: Promise<{ data: ApiResponse<T> }>) {
  return (await request).data.data
}
export const reportApi = {
  mine: async () =>
    (await unwrap(api.get<ApiResponse<{ content: Report[] }>>('/reports/me'))).content,
  find: (id: string, admin = false) =>
    unwrap(
      api.get<ApiResponse<Report>>(`${admin ? '/admin' : ''}/reports/${encodeURIComponent(id)}`),
    ),
  create: (input: ReportInput) => unwrap(api.post<ApiResponse<Report>>('/reports', input)),
  cancel: async (id: string) => {
    await api.delete<void>(`/reports/${encodeURIComponent(id)}`)
  },
  list: (status: string, page: number) =>
    unwrap(
      api.get<ApiResponse<ReportList>>('/admin/reports', {
        params: { status: status || undefined, page },
      }),
    ),
  receive: (id: string) =>
    unwrap(api.post<ApiResponse<Report>>(`/admin/reports/${encodeURIComponent(id)}/receive`)),
  saveMemo: (id: string, adminNote: string) =>
    unwrap(
      api.put<ApiResponse<Report>>(`/admin/reports/${encodeURIComponent(id)}/memo`, { adminNote }),
    ),
  complete: (id: string, adminNote: string) =>
    unwrap(
      api.post<ApiResponse<Report>>(`/admin/reports/${encodeURIComponent(id)}/complete`, {
        adminNote,
      }),
    ),
  contact: (id: string) =>
    unwrap(
      api.get<ApiResponse<{ phoneNumber: string }>>(
        `/admin/reports/${encodeURIComponent(id)}/contact`,
      ),
    ),
}
export function reportSaveMessage(report: Report, message: string) {
  if (report.smsStatus === 'LIMIT_EXCEEDED')
    return `${message} 문자 발송 한도를 초과하여 앱 알림으로 안내됩니다.`
  if (report.smsStatus === 'FAILED')
    return `${message} 문자 발송에 실패했습니다. 앱 알림으로 안내됩니다.`
  if (report.smsStatus === 'NOT_CONFIGURED')
    return `${message} 문자 발송이 연결되지 않아 앱 알림으로 안내됩니다.`
  return message
}
