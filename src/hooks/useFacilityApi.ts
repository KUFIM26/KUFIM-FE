import api from '../apis/axios'
import type { ApiResponse, FacilityDto, FacilityInput } from '../apis/type'
export const useFacilityApi = {
  findAll: () => api.get<ApiResponse<FacilityDto[]>>('/facilities'),
  find: (id: number) => api.get<ApiResponse<FacilityDto>>(`/facilities/${id}`),
  adminFindAll: () => api.get<ApiResponse<FacilityDto[]>>('/admin/facilities'),
  make: (data: FacilityInput) => api.post<ApiResponse<FacilityDto>>('/admin/facilities', data),
  update: (id: number, data: FacilityInput) =>
    api.patch<ApiResponse<FacilityDto>>(`/admin/facilities/${id}`, data),
  delete: (id: number) => api.delete<void>(`/admin/facilities/${id}`),
}
