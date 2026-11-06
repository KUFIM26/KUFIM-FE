import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Asset, Card } from './ui'
import { reportLabels, reportSteps, reportCategories } from '../apis/report'
import type { Report, ReportStatus } from '../apis/report'
import { reportAssets, reportDate } from '../data/report-design'
const base = '/assets/figma/reports'
export function ReportHeading({
  children,
  info = false,
  danger = false,
}: {
  children: ReactNode
  info?: boolean
  danger?: boolean
}) {
  return (
    <h2
      className={`flex items-center gap-1.5 text-base font-bold ${info ? 'text-[#989898]' : danger ? 'text-[#ff4545]' : ''}`}
    >
      <Asset
        src={info ? reportAssets.info : danger ? `${base}/267-726/2e9ec.svg` : reportAssets.heading}
      />
      {children}
    </h2>
  )
}
export function ReportBadge({ status }: { status: ReportStatus }) {
  return <span className={`report-badge report-status-${status}`}>{reportLabels[status]}</span>
}
export function ReportLegend() {
  const descriptions = [
    '신고가 신청되었습니다.',
    '신고 내용을 관리자가 확인하였습니다.',
    '신고 내용을 확인하여 조치 중입니다.',
    '신고 처리가 완료되었습니다.',
  ]
  return (
    <section className="flex flex-col gap-2">
      <ReportHeading info>진행 상황</ReportHeading>
      <Card className="report-legend">
        {reportSteps.map((status, i) => (
          <div key={status} className="flex items-center gap-3">
            <ReportBadge status={status} />
            <p className="text-[10px] font-medium">{descriptions[i]}</p>
          </div>
        ))}
      </Card>
    </section>
  )
}
export function ReportProgress({ report }: { report: Report }) {
  if (report.status === 'CANCELED')
    return (
      <Card className="p-4">
        <ReportBadge status="CANCELED" />
      </Card>
    )
  const times = [report.createdAt, report.receivedAt, report.inProgressAt, report.completedAt]
  const current = reportSteps.indexOf(report.status)
  return (
    <section className="flex flex-col gap-2">
      <ReportHeading info>진행 상황</ReportHeading>
      <Card className="report-progress">
        <ol aria-label="신고 진행 상황">
          {reportSteps.map((status, i) => (
            <li key={status} aria-current={i === current ? 'step' : undefined}>
              <span className={`report-step ${i <= current ? 'is-done' : ''}`}>{i + 1}</span>
              <strong>{reportLabels[status]}</strong>
              <time>
                {times[i]
                  ? new Date(times[i]!).toLocaleTimeString('en-GB', {
                      timeZone: 'Asia/Seoul',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </time>
            </li>
          ))}
        </ol>
      </Card>
    </section>
  )
}
export function ReportRows({ reports, admin = false }: { reports: Report[]; admin?: boolean }) {
  return (
    <Card className="overflow-hidden">
      <ul>
        {reports.map((report) => (
          <li key={report.reportId} className="border-b border-[#e8e8e8] last:border-0">
            <Link
              to={`${admin ? '/admin/reports' : '/report'}/${report.reportId}`}
              className="report-row"
            >
              <span className={`report-row-bar report-status-${report.status}`} />
              <ReportBadge status={report.status} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-[#383838]">{report.title}</h3>
                <p className="mt-1 text-[10px]">{reportDate(report.createdAt)}</p>
                {admin && (
                  <p className="mt-1 text-[10px] text-muted">
                    {reportCategories[report.category]} · {report.place}
                    {report.elapsedMinutes !== undefined ? ` · ${report.elapsedMinutes}분 전` : ''}
                  </p>
                )}
              </div>
              <Asset src={reportAssets.arrow} />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
export function ReportSummary({ report, children }: { report: Report; children?: ReactNode }) {
  return (
    <section className="green-gradient rounded-xl p-3.5 text-white shadow-card">
      <div className="mb-2 flex items-center gap-2.5">
        <ReportBadge status={report.status} />
        <time className="text-xs">{reportDate(report.createdAt)}</time>
      </div>
      <h2 className="text-lg font-bold">{report.title}</h2>
      <p className="mt-2 text-xs font-semibold">
        {report.reporterName}
        {report.phoneNumberMasked && `　|　${report.phoneNumberMasked}`}
      </p>
      {children}
    </section>
  )
}
export function ReportContent({ report }: { report: Report }) {
  return (
    <>
      <section className="flex flex-col gap-2">
        <ReportHeading>발생 장소</ReportHeading>
        <Card className="report-value">{report.place}</Card>
      </section>
      <section className="flex flex-col gap-2">
        <ReportHeading>신고 내용</ReportHeading>
        <Card className="report-value min-h-[132px] whitespace-pre-wrap">{report.content}</Card>
      </section>
    </>
  )
}
