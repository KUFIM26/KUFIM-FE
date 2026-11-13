const base = '/assets/figma/reports'
export const reportAssets = {
  back: `${base}/254-2/87cdd.svg`,
  heading: `${base}/254-2/2db61.svg`,
  info: `${base}/254-2/8b81a.svg`,
  phone: `${base}/254-2/fb314.svg`,
  location: `${base}/254-2/411ab.svg`,
  arrow: `${base}/254-2/891b6.svg`,
  check: `${base}/254-78/6e80b.svg`,
}
export function reportDate(value: string) {
  const date = new Date(value)
  const day = date
    .toLocaleDateString('en-GB', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit' })
    .split('/')
  const time = date.toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${day[1]}.${day[0]}. ${time}`
}
export function reportElapsed(minutes: number) {
  const value = Math.max(0, Math.floor(minutes))
  if (value < 60) return `${value}분 전`
  if (value < 1440) return `${Math.floor(value / 60)}시간 전`
  return `${Math.floor(value / 1440)}일 전`
}
// 상황실 대표번호. VITE_CONTROL_ROOM_PHONE 이 설정되면 그 값이 우선한다.
export const controlRoomTel = `tel:${(import.meta.env.VITE_CONTROL_ROOM_PHONE || '02-450-3990').replace(/[^0-9+]/g, '')}`
