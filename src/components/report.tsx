import { useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Asset, Button, Card } from './ui'
import { reportLabels, reportSteps, reportCategories } from '../apis/report'
import type { Report, ReportStatus } from '../apis/report'
import { reportAssets, reportDate, reportElapsed } from '../data/report-design'
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
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  return (
    <>
      {/* 안내는 평소엔 회색 글씨 한 줄로 두고, 누르면 팝업으로 펼친다 */}
      <button
        type="button"
        aria-haspopup="dialog"
        className="flex w-fit items-center gap-1.5 text-base font-bold text-[#989898]"
        onClick={() => ref.current?.showModal()}
      >
        <Asset src={reportAssets.info} />
        진행 상황
      </button>
      <dialog
        ref={ref}
        aria-labelledby={id}
        className="confirm-dialog"
        onClick={(event) => {
          if (event.target === event.currentTarget) ref.current?.close()
        }}
      >
        <h2 id={id} className="text-center text-xl font-bold">
          진행 상황
        </h2>
        <div className="report-legend my-3 !p-0">
          {reportSteps.map((status, i) => (
            <div key={status} className="flex items-center gap-3">
              <ReportBadge status={status} />
              <p className="text-xs font-medium">{descriptions[i]}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <Button
            className="!min-h-10 !w-[132px] !py-2 !text-base"
            onClick={() => ref.current?.close()}
          >
            닫기
          </Button>
        </div>
      </dialog>
    </>
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
export function ReportRows({ reports }: { reports: Report[] }) {
  return (
    <Card className="overflow-hidden">
      <ul>
        {reports.map((report) => (
          <li key={report.reportId} className="border-b border-[#e8e8e8] last:border-0">
            <Link to={`/report/${report.reportId}`} className="report-row">
              <span className={`report-row-bar report-status-${report.status}`} />
              <ReportBadge status={report.status} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-[#383838]">{report.title}</h3>
                <p className="mt-1 text-[10px]">{reportDate(report.createdAt)}</p>
              </div>
              <Asset src={reportAssets.arrow} />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
// 관리자 목록: 신고 유형별로 묶어 ReportSummary와 같은 형태의 카드로 보여준다
/** 관리자 목록 행. 방문자용 ReportRows에 유형·장소·경과 시간을 더한다. */
export function AdminReportRows({ reports }: { reports: Report[] }) {
  return (
    <Card className="overflow-hidden">
      <ul>
        {reports.map((report) => (
          <li key={report.reportId} className="border-b border-[#e8e8e8] last:border-0">
            <Link to={`/admin/reports/${report.reportId}`} className="report-row">
              <span className={`report-row-bar report-status-${report.status}`} />
              <ReportBadge status={report.status} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-[#383838]">{report.title}</h3>
                <p className="mt-1 text-[10px]">{reportDate(report.createdAt)}</p>
                <p className="mt-1 truncate text-[10px] text-muted">
                  {reportCategories[report.category]} · {report.place}
                  {report.elapsedMinutes !== undefined &&
                    ` · ${reportElapsed(report.elapsedMinutes)}`}
                </p>
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
        {/* 처리 상태는 진행 단계 표시가 따로 보여주므로, 카드에는 신고 유형을 표시한다 */}
        <span className="report-badge bg-white/50">{reportCategories[report.category]}</span>
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
