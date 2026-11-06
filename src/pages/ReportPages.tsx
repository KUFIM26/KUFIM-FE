import { reportAssets } from '../data/report-design'
import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BottomActions, Page } from '../components/layout'
import { Asset, Button, Card, ConfirmDialog, EmptyState } from '../components/ui'
import { RequestState } from '../components/RequestState'
import {
  ReportContent,
  ReportHeading,
  ReportLegend,
  ReportProgress,
  ReportRows,
  ReportSummary,
} from '../components/report'
import { reportApi, reportCategories } from '../apis/report'
import type { ReportCategory, ReportInput } from '../apis/report'
import { useAction, useResource } from '../hooks/useResource'

export function ReportLandingPage() {
  const resource = useResource(reportApi.mine, 10000)
  const phone = import.meta.env.VITE_CONTROL_ROOM_PHONE?.replace(/[^0-9+]/g, '')
  return (
    <Page
      title="신고하기"
      back="/menu"
      backIcon={reportAssets.back}
      className="report-page report-landing"
    >
      <div className="page-pad !gap-3">
        <Card className="p-4">
          <h2 className="text-sm font-bold">신고하기 전에!</h2>
          <ol className="mt-1.5 list-decimal space-y-3 pl-[18px] text-xs font-medium">
            <li>
              무대/주취자 등 매우 긴급을 요하는 건의 경우 아래 상황실 연락처로 직접 문의하시기
              바랍니다.
            </li>
            <li>또한 직접 방문이 필요한 경우 아래 버튼을 클릭하여 상황실 위치를 확인해주세요.</li>
          </ol>
        </Card>
        {phone ? (
          <a className="primary-button green-gradient gap-2" href={`tel:${phone}`}>
            <Asset src={reportAssets.phone} />
            상황실 전화하기
          </a>
        ) : (
          <div>
            <Button disabled className="gap-2">
              <Asset src={reportAssets.phone} />
              상황실 전화하기
            </Button>
            <p className="mt-1.5 text-center text-xs text-muted">상황실 연락처 등록 대기 중</p>
          </div>
        )}
        <Link className="primary-button green-gradient gap-2" to="/map?facility=상황실">
          <Asset src={reportAssets.location} />
          상황실 위치 보기
        </Link>
        <ReportLegend />
        <section className="flex flex-col gap-2">
          <ReportHeading>나의 신고 내역</ReportHeading>
          <RequestState
            loading={resource.loading}
            error={resource.error}
            retry={() => void resource.refresh()}
          />
          {resource.data &&
            (resource.data.length ? (
              <ReportRows reports={resource.data} />
            ) : (
              <EmptyState>아직 신청한 신고가 없습니다.</EmptyState>
            ))}
        </section>
      </div>
      <BottomActions>
        <Link className="primary-button green-gradient" to="/report/new">
          신고하기
        </Link>
      </BottomActions>
    </Page>
  )
}
const initial: ReportInput = {
  category: 'OTHER',
  title: '',
  reporterName: '',
  phoneNumber: '',
  place: '',
  content: '',
  privacyConsent: false,
}
export function ReportFormPage() {
  const [form, setForm] = useState(initial)
  const [cancel, setCancel] = useState(false)
  const action = useAction()
  const navigate = useNavigate()
  const update = <K extends keyof ReportInput>(key: K, value: ReportInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))
  return (
    <Page
      title="신고하기"
      back="/report"
      backIcon={reportAssets.back}
      className="report-page report-form"
    >
      <form
        id="report-form"
        className="page-pad !gap-5"
        onSubmit={(event) => {
          event.preventDefault()
          void action.run(async () => {
            const report = await reportApi.create({
              ...form,
              title: form.title.trim(),
              reporterName: form.reporterName.trim(),
              place: form.place.trim(),
              content: form.content.trim(),
            })
            navigate(`/report/${report.reportId}`, { replace: true })
          })
        }}
      >
        <fieldset disabled={action.pending} className="flex min-w-0 flex-col gap-5">
          <label className="report-field">
            <ReportHeading>신고 유형</ReportHeading>
            <select
              className="form-control report-control"
              value={form.category}
              onChange={(e) => update('category', e.target.value as ReportCategory)}
            >
              {Object.entries(reportCategories).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {(
            [
              ['title', '신고 제목', 30, '신고 제목을 입력하세요.(30자 이내)'],
              ['reporterName', '신고자 이름', 10, '신고자 성함을 입력하세요.(10자 이내)'],
              ['phoneNumber', '신고자 연락처', 11, '신고자 연락처를 입력하세요.(11자 이내)'],
              ['place', '발생 장소', 50, '발생 장소를 입력하세요.(최대한 구체적으로)'],
            ] as const
          ).map(([key, label, max, placeholder]) => (
            <label className="report-field" key={key}>
              <ReportHeading>{label}</ReportHeading>
              <input
                className="form-control report-control"
                value={form[key]}
                required
                maxLength={key === 'phoneNumber' ? undefined : max}
                pattern={key === 'phoneNumber' ? '[0-9]{11}' : '.*\\S.*'}
                type={key === 'phoneNumber' ? 'tel' : 'text'}
                inputMode={key === 'phoneNumber' ? 'numeric' : undefined}
                autoComplete={
                  key === 'reporterName' ? 'name' : key === 'phoneNumber' ? 'tel' : 'off'
                }
                placeholder={placeholder}
                onChange={(e) =>
                  update(
                    key,
                    key === 'phoneNumber'
                      ? e.target.value.replace(/\D/g, '').slice(0, 11)
                      : e.target.value,
                  )
                }
              />
            </label>
          ))}
          <label className="report-field">
            <ReportHeading>신고 내용</ReportHeading>
            <textarea
              required
              maxLength={300}
              className="form-control report-control !min-h-[132px]"
              placeholder="신고 내용을 입력하세요. (300자 이내)"
              value={form.content}
              onChange={(e) => update('content', e.target.value)}
            />
            <span className="text-right text-xs text-muted">{form.content.length}/300</span>
          </label>
          <section className="report-field">
            <ReportHeading>개인정보 활용 동의</ReportHeading>
            <Card className="report-value">
              신고 접수와 처리 결과 안내를 위해 이름, 전화번호를 수집·이용하며, 축제 종료 후
              파기합니다.
            </Card>
            <label className="relative ml-auto flex w-fit items-center justify-end gap-2 text-sm text-[#8b8b8b]">
              <input
                type="checkbox"
                required
                className="peer absolute left-0 z-10 size-[22px] cursor-pointer opacity-0"
                checked={form.privacyConsent}
                onChange={(e) => update('privacyConsent', e.target.checked)}
              />
              <Asset
                src={reportAssets.check}
                className="rounded-full opacity-50 peer-checked:opacity-100 peer-checked:ring-2 peer-checked:ring-brand peer-focus-visible:outline-2"
              />
              동의합니다
            </label>
          </section>
        </fieldset>
        <RequestState error={action.error} />
      </form>
      <BottomActions>
        <div className="flex gap-2">
          <Button
            type="submit"
            form="report-form"
            tone="red"
            disabled={action.pending}
            className="!bg-[#ffa3a3] !text-[#3b0500]"
          >
            {action.pending ? '신고 중…' : '신고하기'}
          </Button>
          <Button tone="gray" disabled={action.pending} onClick={() => setCancel(true)}>
            취소하기
          </Button>
        </div>
      </BottomActions>
      <ConfirmDialog
        open={cancel}
        title="신고 중단하기"
        onClose={() => setCancel(false)}
        onConfirm={() => navigate('/report')}
        confirmLabel="중단하기"
        cancelLabel="돌아가기"
      >
        입력하신 모든 정보가 삭제됩니다.
        <br />
        신고를 중단하시겠습니까?
      </ConfirmDialog>
    </Page>
  )
}
export function ReportDetailPage() {
  const { id = '' } = useParams()
  const loader = useCallback(() => reportApi.find(id), [id])
  const resource = useResource(loader, 10000)
  const action = useAction()
  const [cancel, setCancel] = useState(false)
  const report = resource.data
  return (
    <Page title="신고하기" back="/report" backIcon={reportAssets.back} className="report-page">
      <div className="page-pad !gap-5">
        <RequestState
          loading={resource.loading}
          error={resource.error}
          retry={() => void resource.refresh()}
        />
        <RequestState error={action.error} />
        {report && (
          <>
            <ReportProgress report={report} />
            <ReportSummary report={report} />
            <ReportContent report={report} />
            {report.adminNote && (
              <section className="report-field">
                <ReportHeading>처리 내용</ReportHeading>
                <Card className="report-value whitespace-pre-wrap">{report.adminNote}</Card>
              </section>
            )}
            {report.status === 'SUBMITTED' && (
              <Button tone="gray" disabled={action.pending} onClick={() => setCancel(true)}>
                신고 취소
              </Button>
            )}
          </>
        )}
      </div>
      <ConfirmDialog
        open={cancel}
        title="신고 취소하기"
        onClose={() => setCancel(false)}
        onConfirm={() => {
          setCancel(false)
          void action.run(async () => {
            await reportApi.cancel(id)
            await resource.refresh()
          })
        }}
        confirmLabel="신고 취소"
        cancelLabel="유지하기"
      >
        신청한 신고를 취소하시겠습니까?
      </ConfirmDialog>
    </Page>
  )
}
