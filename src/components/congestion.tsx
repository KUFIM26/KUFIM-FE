import { congestionStyles, displayLevel, relativeTime } from '../api/congestion'
import type { ApiZone } from '../api/types'
import { Card, SectionTitle } from './ui'

// Always color + Korean label + 4-cell gauge together. Never drop the text or the gauge:
// color alone does not separate 혼잡 and 매우 혼잡 for red-green color blindness (STG-004).
export function CongestionBadge({ zone, now }: { zone: ApiZone; now: number }) {
  const key = displayLevel(zone.level, zone.updatedAt, now)
  const style = congestionStyles[key]
  return (
    <span
      role="img"
      aria-label={`혼잡도 ${style.label}${style.cells ? `, 4단계 중 ${style.cells}단계` : ''}`}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-bold"
      style={{ background: style.bg, color: style.fg, borderColor: style.border }}
    >
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4].map((cell) => (
          <span
            key={cell}
            className="h-3 w-1.5 rounded-sm"
            style={{ background: style.fg, opacity: cell <= style.cells ? 1 : 0.3 }}
          />
        ))}
      </span>
      {style.label}
    </span>
  )
}

export function ZoneRow({ zone, now }: { zone: ApiZone; now: number }) {
  const known = displayLevel(zone.level, zone.updatedAt, now) !== 'UNKNOWN'
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#eee] px-4 py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-base font-bold">{zone.name}</p>
        <p className="mt-1 text-xs text-muted">
          {known && zone.estimatedPeople != null && (
            <strong className="mr-2 text-[#383838]">
              약 {zone.estimatedPeople.toLocaleString()}명
            </strong>
          )}
          {relativeTime(zone.updatedAt, now)} 갱신
        </p>
      </div>
      <CongestionBadge zone={zone} now={now} />
    </div>
  )
}

export function StageCongestion({
  name,
  zones,
  now,
}: {
  name: string
  zones: ApiZone[]
  now: number
}) {
  return (
    <section className="flex flex-col gap-2" aria-label={`${name} 혼잡도`}>
      <SectionTitle>{name} 혼잡도</SectionTitle>
      <Card className="overflow-hidden">
        {zones.map((zone) => (
          <ZoneRow key={zone.zoneId} zone={zone} now={now} />
        ))}
      </Card>
    </section>
  )
}
