import api from '../apis/axios'
import type { ApiResponse, Festival, Stage, Floorplan, MapPin } from '../apis/type'
export const useFestivalApi = {
  find: () => api.get<ApiResponse<Festival>>('/festival'),
  stages: () => api.get<ApiResponse<Stage[]>>('/stages'),
  map: () => api.get<ApiResponse<{ floorplan: Floorplan }>>('/map'),
  pins: () => api.get<ApiResponse<MapPin[]>>('/map/pins'),
}
