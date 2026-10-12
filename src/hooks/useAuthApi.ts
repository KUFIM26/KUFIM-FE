import api from '../apis/axios'
import type { Account, ApiResponse } from '../apis/type'
export const useAuthApi = {
  login: (data: { loginId: string; password: string }) =>
    api.post<ApiResponse<{ account: Account; expiresIn: number }>>('/admin/auth/login', data),
  me: () => api.get<ApiResponse<Account>>('/admin/auth/me'),
  logout: () => api.post<void>('/admin/auth/logout'),
}
