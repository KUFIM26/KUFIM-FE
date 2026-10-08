import { request, requestBlob } from './client'
import type {
  AcceptingStatus,
  ApiAdminAccount,
  ApiAdminQueue,
  ApiBooth,
  ApiFacility,
  ApiFestival,
  ApiNotice,
  ApiNotificationPage,
  ApiPerformance,
  ApiStage,
  ApiTicket,
  ApiWaitingConfig,
  ApiWaitingStatus,
  BoothInput,
  FacilityInput,
  NoticeInput,
  PerformanceInput,
  WaitingCreateInput,
} from './types'

// Create (POST), update (PATCH, partial) and delete for one admin content collection.
const content = <Input>(path: string) => ({
  create: (input: Input) => request<unknown>(`/admin/${path}`, { method: 'POST', body: input }),
  update: (id: string, input: Partial<Input>) =>
    request<unknown>(`/admin/${path}/${id}`, { method: 'PATCH', body: input }),
  remove: (id: string) => request<void>(`/admin/${path}/${id}`, { method: 'DELETE' }),
})

export const api = {
  festival: () => request<ApiFestival>('/festival'),
  stages: () => request<ApiStage[]>('/stages'),
  performances: () => request<ApiPerformance[]>('/performances'),
  performance: (id: string) => request<ApiPerformance>(`/performances/${id}`),
  booths: (query?: { sort?: 'popular'; limit?: number; waitingOnly?: boolean }) =>
    request<ApiBooth[]>('/booths', { query }),
  booth: (id: string) => request<ApiBooth>(`/booths/${id}`),
  boothByCode: (code: string) => request<ApiBooth>(`/booths/code/${encodeURIComponent(code)}`),
  facilities: () => request<ApiFacility[]>('/facilities'),
  notices: () => request<ApiNotice[]>('/notices'),
  notice: (id: string) => request<ApiNotice>(`/notices/${id}`),

  waitingStatus: (boothId: string) =>
    request<ApiWaitingStatus>(`/booths/${boothId}/waiting-status`),
  registerWaiting: (boothId: string, input: WaitingCreateInput, idempotencyKey: string) =>
    request<ApiTicket>(`/booths/${boothId}/waitings`, {
      method: 'POST',
      body: input,
      idempotencyKey,
    }),
  myWaitings: () => request<ApiTicket[]>('/waitings/me'),
  cancelWaiting: (waitingId: string) =>
    request<void>(`/waitings/${waitingId}`, { method: 'DELETE' }),

  notifications: () => request<ApiNotificationPage>('/notifications', { query: { size: 50 } }),
  readNotification: (id: number) =>
    request<unknown>(`/notifications/${id}/read`, { method: 'PATCH' }),
  readAllNotifications: () => request<unknown>('/notifications/read-all', { method: 'PATCH' }),

  admin: {
    login: (loginId: string, password: string) =>
      request<{ account: ApiAdminAccount; expiresIn: number }>('/admin/auth/login', {
        method: 'POST',
        body: { loginId, password },
      }),
    me: () => request<ApiAdminAccount>('/admin/auth/me'),
    logout: () => request<void>('/admin/auth/logout', { method: 'POST' }),
    queue: (boothId: string) => request<ApiAdminQueue>(`/admin/booths/${boothId}/waitings`),
    call: (waitingId: string, idempotencyKey: string) =>
      request<ApiTicket>(`/admin/waitings/${waitingId}/call`, { method: 'POST', idempotencyKey }),
    enter: (waitingId: string) =>
      request<ApiTicket>(`/admin/waitings/${waitingId}/enter`, { method: 'POST' }),
    cancel: (waitingId: string) =>
      request<ApiTicket>(`/admin/waitings/${waitingId}/cancel`, { method: 'POST' }),
    contact: (waitingId: string) =>
      request<{ waitingId: string; phoneNumber: string }>(`/admin/waitings/${waitingId}/contact`),
    waitingConfig: (boothId: string) =>
      request<ApiWaitingConfig>(`/admin/booths/${boothId}/waiting-config`),
    updateWaitingConfig: (
      boothId: string,
      patch: { acceptingStatus?: AcceptingStatus; estimateMinutesPerTeam?: number },
    ) =>
      request<ApiWaitingConfig>(`/admin/booths/${boothId}/waiting-config`, {
        method: 'PATCH',
        body: patch,
      }),
    qrPng: (boothId: string) => requestBlob(`/admin/booths/${boothId}/qr`, 'image/png'),
    notices: content<NoticeInput>('notices'),
    performances: content<PerformanceInput>('performances'),
    booths: content<BoothInput>('booths'),
    facilities: content<FacilityInput>('facilities'),
    issueQr: (boothId: string) =>
      request<{ boothCode: string; url: string }>(`/admin/booths/${boothId}/qr`, {
        method: 'POST',
      }),
  },
}
