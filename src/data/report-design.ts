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
