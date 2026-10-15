import api from '../apis/axios'
import type { ApiResponse, NotificationPage } from '../apis/type'
export const useNotificationApi = {
  findAll: (page = 0) =>
    api.get<ApiResponse<NotificationPage>>('/notifications', { params: { page, size: 20 } }),
  read: (id: number) =>
    api.patch<ApiResponse<{ notificationId: number; readAt: string }>>(`/notifications/${id}/read`),
  readAll: () =>
    api.patch<ApiResponse<{ readCount: number; unreadCount: number }>>(
      '/notifications/read-all',
      {},
    ),
}
