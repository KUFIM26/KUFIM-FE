import api from './axios'
import type { ApiResponse } from './type'

// 계약: docs/backend-request-lost-found.md
export type LostItemStatus = 'STORED' | 'RETURNED'
export type LostItemCategory = 'ELECTRONICS' | 'WALLET_CARD' | 'ID_CARD' | 'CLOTHING' | 'OTHER'
export type LostItemVerifiedBy = 'STUDENT_ID' | 'ID_CARD' | 'OTHER'

/** 방문자 응답. 인계 완료된 물건은 이름·분류·상태 외에는 null로 내려온다. */
export type LostItem = {
  lostItemId: number
  category: LostItemCategory
  name: string
  status: LostItemStatus
  createdAt: string
  foundPlace: string | null
  foundAt: string | null
  storagePlace: string | null
  description: string | null
  imageUrl: string | null
  thumbnailUrl: string | null
  elapsedMinutes: number | null
}
export type AdminLostItem = LostItem & {
  imagePublic: boolean
  registeredBy: { accountId: number; name: string } | null
  returnedAt: string | null
  returnedBy: { accountId: number; name: string } | null
  receiverName: string | null
  receiverPhoneMasked: string | null
  verifiedBy: LostItemVerifiedBy | null
  returnNote: string | null
}
export type LostItemPage<T> = {
  content: T[]
  page: number
  totalPages: number
  totalElements: number
}
export type AdminLostItemPage = LostItemPage<AdminLostItem> & {
  summary: { stored: number; returned: number; total: number }
}
export type LostItemInput = {
  category: LostItemCategory
  name: string
  foundPlace: string
  foundAt: string
  storagePlace: string
  description: string
  /** undefined: 사진을 건드리지 않음, null: 사진 제거 */
  imageKey?: string | null
  imagePublic: boolean
}
export type LostItemReturnInput = {
  receiverName: string
  receiverPhone?: string
  verifiedBy: LostItemVerifiedBy
  returnNote?: string
}

export const lostItemCategories: Record<LostItemCategory, string> = {
  ELECTRONICS: '전자기기',
  WALLET_CARD: '지갑·카드',
  ID_CARD: '신분증',
  CLOTHING: '의류·잡화',
  OTHER: '기타',
}
export const lostItemStatuses: Record<LostItemStatus, string> = {
  STORED: '보관 중',
  RETURNED: '인계 완료',
}
export const lostItemVerifications: Record<LostItemVerifiedBy, string> = {
  STUDENT_ID: '학생증',
  ID_CARD: '신분증',
  OTHER: '기타',
}
/** 서버가 사진을 강제로 비공개 처리하는 분류 */
export const sensitiveCategories: LostItemCategory[] = ['ID_CARD', 'WALLET_CARD']
export const LOST_ITEM_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const LOST_ITEM_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

async function unwrap<T>(request: Promise<{ data: ApiResponse<T> }>) {
  return (await request).data.data
}
const path = (id: string | number, admin = false) =>
  `${admin ? '/admin' : ''}/lost-items/${encodeURIComponent(id)}`

export type LostItemQuery = {
  category?: LostItemCategory | ''
  status?: LostItemStatus | 'ALL' | ''
  q?: string
  page?: number
}
const params = ({ category, status, q, page = 0 }: LostItemQuery) => ({
  category: category || undefined,
  status: status || undefined,
  q: q || undefined,
  page,
})

export const lostItemApi = {
  list: (query: LostItemQuery) =>
    unwrap(api.get<ApiResponse<LostItemPage<LostItem>>>('/lost-items', { params: params(query) })),
  find: (id: string) => unwrap(api.get<ApiResponse<LostItem>>(path(id))),
  adminList: (query: LostItemQuery) =>
    unwrap(api.get<ApiResponse<AdminLostItemPage>>('/admin/lost-items', { params: params(query) })),
  adminFind: (id: string) => unwrap(api.get<ApiResponse<AdminLostItem>>(path(id, true))),
  uploadImage: (file: Blob) => {
    const body = new FormData()
    body.append('file', file, 'photo.jpg')
    return unwrap(
      api.post<ApiResponse<{ imageKey: string }>>('/admin/lost-items/images', body, {
        // 기본 JSON 헤더를 지워 브라우저가 multipart 경계를 붙이게 한다.
        headers: { 'Content-Type': undefined },
        timeout: 60000,
      }),
    )
  },
  create: (input: LostItemInput) =>
    unwrap(api.post<ApiResponse<AdminLostItem>>('/admin/lost-items', input)),
  update: (id: string, input: Partial<LostItemInput>) =>
    unwrap(api.patch<ApiResponse<AdminLostItem>>(path(id, true), input)),
  giveBack: (id: string, input: LostItemReturnInput) =>
    unwrap(api.post<ApiResponse<AdminLostItem>>(`${path(id, true)}/return`, input)),
  reopen: (id: string) => unwrap(api.post<ApiResponse<AdminLostItem>>(`${path(id, true)}/reopen`)),
  contact: (id: string) =>
    unwrap(api.get<ApiResponse<{ phoneNumber: string }>>(`${path(id, true)}/contact`)),
  remove: async (id: string) => {
    await api.delete<void>(path(id, true))
  },
}

/** 올리기 전에 긴 변 1280px JPEG로 줄인다. 줄일 수 없는 환경이면 원본을 그대로 쓴다. */
export async function shrinkImage(file: File, maxSide = 1280): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    )
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}

/** datetime-local 값(서울 기준) ↔ 서버의 +09:00 문자열 */
export const toSeoulIso = (local: string) => `${local.slice(0, 16)}:00+09:00`
export const toSeoulLocal = (value: string | Date) =>
  new Date(value).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).replace(' ', 'T').slice(0, 16)
