import api from '../apis/axios'
import type { ApiResponse, PerformanceDto, PerformanceInput } from '../apis/type'
export const usePerformanceApi = {
  findAll: () => api.get<ApiResponse<PerformanceDto[]>>('/performances'),
  find: (id: number) => api.get<ApiResponse<PerformanceDto>>(`/performances/${id}`),
  adminFindAll: () => api.get<ApiResponse<PerformanceDto[]>>('/admin/performances'),
  make: (data: PerformanceInput) =>
    api.post<ApiResponse<PerformanceDto>>('/admin/performances', data),
  update: (id: number, data: PerformanceInput) =>
    api.patch<ApiResponse<PerformanceDto>>(`/admin/performances/${id}`, data),
  delete: (id: number) => api.delete<void>(`/admin/performances/${id}`),
}
