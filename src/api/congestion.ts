import { useEffect, useState } from 'react'
import type { CongestionLevel } from './types'

// Colors from KUFIM design tokens (STG-004); contrast and color-blind checks are in the token doc.
export const congestionStyles: Record<
  CongestionLevel | 'UNKNOWN',
  { label: string; cells: number; bg: string; fg: string; border: string }
> = {
  SMOOTH: { label: '원활', cells: 1, bg: '#137C43', fg: '#FFFFFF', border: '#0E5F33' },
  NORMAL: { label: '보통', cells: 2, bg: '#F5C518', fg: '#2A2100', border: '#8A6D00' },
  CROWDED: { label: '혼잡', cells: 3, bg: '#BF5809', fg: '#FFFFFF', border: '#93380A' },
  VERY_CROWDED: { label: '매우 혼잡', cells: 4, bg: '#C1121F', fg: '#FFFFFF', border: '#8A0D16' },
  UNKNOWN: { label: '정보 확인 중', cells: 0, bg: '#F2F5F7', fg: '#4C565F', border: '#767E86' },
}
export const congestionLevels: CongestionLevel[] = ['SMOOTH', 'NORMAL', 'CROWDED', 'VERY_CROWDED']

// Older values must not look current (STG-007). The client decides, using server time.
export const STALE_MS = 15 * 60 * 1000

export function displayLevel(level: CongestionLevel | null, updatedAt: string | null, now: number) {
  if (!level || !updatedAt || now - Date.parse(updatedAt) > STALE_MS) return 'UNKNOWN' as const
  return level
}

// Server-adjusted "now", re-rendered on an interval so relative times and staleness move.
export function useServerNow(clockOffset: number, tickMs = 30000) {
  const [now, setNow] = useState(() => Date.now() + clockOffset)
  useEffect(() => {
    const update = () => setNow(Date.now() + clockOffset)
    const timer = window.setInterval(update, tickMs)
    const first = window.setTimeout(update, 0)
    return () => {
      window.clearInterval(timer)
      window.clearTimeout(first)
    }
  }, [clockOffset, tickMs])
  return now
}

export function relativeTime(iso: string | null, now: number) {
  if (!iso) return '입력 없음'
  const minutes = Math.max(0, Math.floor((now - Date.parse(iso)) / 60000))
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  return `${Math.floor(minutes / 60)}시간 전`
}
