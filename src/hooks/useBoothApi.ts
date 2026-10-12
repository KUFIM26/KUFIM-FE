import api from '../apis/axios'
import type { ApiResponse, BoothDto, BoothInput, WaitingInfo } from '../apis/type'
export const useBoothApi = {
  findAll: (params?: { sort?: 'popular'; limit?: number; waitingOnly?: boolean }) =>
    api.get<ApiResponse<BoothDto[]>>('/booths', { params }),
  find: (id: number) => api.get<ApiResponse<BoothDto>>(`/booths/${id}`),
  findByCode: (code: string) =>
    api.get<ApiResponse<BoothDto>>(`/booths/code/${encodeURIComponent(code)}`),
  status: (id: number) => api.get<ApiResponse<WaitingInfo>>(`/booths/${id}/waiting-status`),
  adminFindAll: () => api.get<ApiResponse<BoothDto[]>>('/admin/booths'),
  make: (data: BoothInput) => api.post<ApiResponse<BoothDto>>('/admin/booths', data),
  update: (id: number, data: BoothInput) =>
    api.patch<ApiResponse<BoothDto>>(`/admin/booths/${id}`, data),
  delete: (id: number) => api.delete<void>(`/admin/booths/${id}`),
  qr: (id: number) => api.get<Blob>(`/admin/booths/${id}/qr`, { responseType: 'blob' }),
}
