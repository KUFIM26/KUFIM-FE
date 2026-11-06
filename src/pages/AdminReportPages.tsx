import { reportAssets } from '../data/report-design'
import { useCallback, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BottomActions, Page } from '../components/layout'
import { Button, Card, Chips, ConfirmDialog, EmptyState } from '../components/ui'
import { RequestState } from '../components/RequestState'
import {
  ReportContent,
  ReportHeading,
  ReportLegend,
  ReportProgress,
  ReportRows,
  ReportSummary,
} from '../components/report'
import { reportApi, reportLabels, reportSaveMessage, reportSteps } from '../apis/report'
import { useAction, useResource } from '../hooks/useResource'

export function AdminReportListPage() {
  const [status, setStatus] = useState('SUBMITTED')
  const [page, setPage] = useState(0)
  const loader = useCallback(() => reportApi.list(status, page), [status, page])
  const resource = useResource(loader, 10000)
  const options = ['', ...reportSteps, 'CANCELED']
  return (
    <Page
      title="신고하기"
      back="/admin"
      backIcon={reportAssets.back}
      className="report-page report-admin-list"
    >
      <div className="page-pad !gap-4">
        <ReportLegend />
        <section className="flex flex-col gap-2">
          <ReportHeading>접수된 신고 내역</ReportHeading>
          <Chips
            compact
            options={options.map((s) =>
              s ? reportLabels[s as keyof typeof reportLabels] : '전체',
            )}
            value={status ? reportLabels[status as keyof typeof reportLabels] : '전체'}
            onChange={(label) => {
              setStatus(
                options.find(
                  (s) => (s ? reportLabels[s as keyof typeof reportLabels] : '전체') === label,
                ) || '',
              )
              setPage(0)
            }}
          />
          {resource.data && (
            <p className="text-xs text-muted">
              신청 {resource.data.summary.submitted} · 접수 {resource.data.summary.received} · 처리
              중 {resource.data.summary.inProgress} · 완료 {resource.data.summary.completed} · 취소{' '}
              {resource.data.summary.canceled}
            </p>
          )}
          <RequestState
            loading={resource.loading}
            error={resource.error}
            retry={() => void resource.refresh()}
          />
          {resource.data &&
            (resource.data.content.length ? (
              <ReportRows admin reports={resource.data.content} />
            ) : (
              <EmptyState>해당 상태의 신고가 없습니다.</EmptyState>
            ))}
          {resource.data && resource.data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button disabled={!page} onClick={() => setPage((p) => p - 1)}>
                이전
              </Button>
              <span className="shrink-0 px-3">
                {page + 1}/{resource.data.totalPages}
              </span>
              <Button
                disabled={page + 1 >= resource.data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                다음
              </Button>
            </div>
          )}
        </section>
      </div>
    </Page>
  )
}
export function AdminReportDetailPage() {
  const { id = '' } = useParams()
  // The receive endpoint is idempotent; keep a single request per mounted report,
  // including React Strict Mode's repeated effects and manual retries.
  const receiving = useRef<{ id: string; promise: ReturnType<typeof reportApi.receive> } | null>(
    null,
  )
  const [message, setMessage] = useState('')
  const loader = useCallback(async () => {
    const report = await reportApi.find(id, true)
    if (report.status !== 'SUBMITTED') return report
    if (receiving.current?.id !== id) {
      receiving.current = {
        id,
        promise: reportApi.receive(id).catch((error) => {
          receiving.current = null
          throw error
        }),
      }
    }
    const received = await receiving.current.promise
    setMessage(reportSaveMessage(received, '신고를 접수했습니다.'))
    return received
  }, [id])
  const resource = useResource(loader)
  const action = useAction()
  const [draft, setDraft] = useState<{ id: string; value: string } | null>(null)
  const [contact, setContact] = useState<{ id: string; value: string } | null>(null)
  const phone = contact?.id === id ? contact.value : ''
  const [complete, setComplete] = useState(false)
  const report = resource.data
  const memo = draft?.id === id ? draft.value : report?.adminNote || ''
  const setMemo = (value: string) => setDraft({ id, value })
  const closed = report?.status === 'COMPLETED' || report?.status === 'CANCELED'
  const save = (finish: boolean) =>
    void action.run(async () => {
      const updated = finish
        ? await reportApi.complete(id, memo.trim())
        : await reportApi.saveMemo(id, memo.trim())
      setMessage(
        reportSaveMessage(
          updated,
          finish ? '신고 처리를 완료했습니다.' : '처리 내용을 저장했습니다.',
        ),
      )
      await resource.refresh()
    })
  return (
    <Page
      title="신고하기"
      back="/admin/reports"
      backIcon={reportAssets.back}
      className="report-page report-admin-detail"
    >
      <div className="page-pad !gap-4">
        <RequestState
          loading={resource.loading}
          error={resource.error}
          retry={() => void resource.refresh()}
        />
        <RequestState error={action.error} />
        {message && (
          <p role="status" className="text-xs text-brand">
            {message}
          </p>
        )}
        {report && (
          <>
            <ReportSummary report={report}>
              <button
                type="button"
                className="mt-2 text-xs underline disabled:opacity-50"
                disabled={action.pending || !!phone}
                onClick={() =>
                  void action.run(async () =>
                    setContact({ id, value: (await reportApi.contact(id)).phoneNumber }),
                  )
                }
              >
                {phone || '연락처 보기'}
              </button>
            </ReportSummary>
            <ReportContent report={report} />
            <ReportProgress report={report} />
            <label className="report-field">
              <ReportHeading danger>처리 내용 기록</ReportHeading>
              <textarea
                className="form-control report-control !min-h-[132px]"
                placeholder="신고 처리 경과를 입력하세요."
                maxLength={300}
                value={memo}
                disabled={closed || action.pending}
                onChange={(e) => setMemo(e.target.value)}
              />
              <span className="text-right text-xs text-muted">{memo.length}/300</span>
            </label>
            {!closed && (
              <section className="report-field">
                <ReportHeading>진행 상태 변경</ReportHeading>
                <Card className="p-3.5">
                  <p className="mb-3 text-xs leading-relaxed text-muted">
                    처리 내용을 저장하면 ‘처리 중’으로 변경됩니다. 조치를 마쳤다면 완료
                    처리해주세요.
                  </p>
                  <Button disabled={action.pending} onClick={() => setComplete(true)}>
                    완료 처리
                  </Button>
                </Card>
              </section>
            )}
          </>
        )}
      </div>
      {report && !closed && (
        <BottomActions>
          <div className="flex gap-2">
            <Button disabled={action.pending || !memo.trim()} onClick={() => save(false)}>
              저장하기
            </Button>
            <Button
              tone="gray"
              disabled={action.pending}
              onClick={() => setMemo(report.adminNote || '')}
            >
              취소하기
            </Button>
          </div>
        </BottomActions>
      )}
      <ConfirmDialog
        open={complete}
        title="신고 처리 완료"
        onClose={() => setComplete(false)}
        onConfirm={() => {
          setComplete(false)
          save(true)
        }}
        confirmLabel="완료 처리"
        cancelLabel="돌아가기"
      >
        신고 처리를 완료하시겠습니까?
        <br />
        완료 후에는 처리 내용을 수정할 수 없습니다.
      </ConfirmDialog>
    </Page>
  )
}
