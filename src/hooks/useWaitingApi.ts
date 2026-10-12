import api from '../apis/axios'
import type { ApiResponse, WaitingInput, WaitingTicket, Queue, WaitingConfig } from '../apis/type'
export const useWaitingApi = {
  mine: () => api.get<ApiResponse<WaitingTicket[]>>('/waitings/me'),
  find: (id: string) => api.get<ApiResponse<WaitingTicket>>(`/waitings/${id}`),
  make: (boothId: number, data: WaitingInput, key: string) =>
    api.post<ApiResponse<WaitingTicket>>(`/booths/${boothId}/waitings`, data, {
      headers: { 'Idempotency-Key': key },
    }),
  delete: (id: string) => api.delete<void>(`/waitings/${id}`),
  queue: (boothId: number) => api.get<ApiResponse<Queue>>(`/admin/booths/${boothId}/waitings`),
  config: (boothId: number) =>
    api.get<ApiResponse<WaitingConfig>>(`/admin/booths/${boothId}/waiting-config`),
  updateConfig: (
    boothId: number,
    data: Pick<WaitingConfig, 'acceptingStatus' | 'estimateMinutesPerTeam'>,
  ) => api.patch<ApiResponse<WaitingConfig>>(`/admin/booths/${boothId}/waiting-config`, data),
  call: (id: string, key: string) =>
    api.post<ApiResponse<WaitingTicket>>(`/admin/waitings/${id}/call`, null, {
      headers: { 'Idempotency-Key': key },
    }),
  cancel: (id: string) => api.post<ApiResponse<WaitingTicket>>(`/admin/waitings/${id}/cancel`),
  enter: (id: string) => api.post<ApiResponse<WaitingTicket>>(`/admin/waitings/${id}/enter`),
  noShow: (id: string) => api.post<ApiResponse<WaitingTicket>>(`/admin/waitings/${id}/no-show`),
  contact: (id: string) =>
    api.get<ApiResponse<{ phoneNumber: string }>>(`/admin/waitings/${id}/contact`),
}
