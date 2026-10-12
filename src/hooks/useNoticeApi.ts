import api from '../apis/axios'
import type { ApiResponse, NoticeDto, NoticeInput } from '../apis/type'
export const useNoticeApi = {
  findAll: () => api.get<ApiResponse<NoticeDto[]>>('/notices'),
  find: (id: number) => api.get<ApiResponse<NoticeDto>>(`/notices/${id}`),
  make: (data: NoticeInput) => api.post<ApiResponse<NoticeDto>>('/admin/notices', data),
  update: (id: number, data: NoticeInput) =>
    api.patch<ApiResponse<NoticeDto>>(`/admin/notices/${id}`, data),
  delete: (id: number) => api.delete<void>(`/admin/notices/${id}`),
}
