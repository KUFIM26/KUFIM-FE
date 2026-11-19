import { controlRoomTel, reportAssets } from '../data/report-design'
import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BottomActions, Page } from '../components/layout'
import { Asset, Button, Card, Chips, ConfirmDialog, EmptyState } from '../components/ui'
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
import { useTranslation } from 'react-i18next'
import { useLabel } from '../i18n/label'

export function ReportLandingPage() {
  const resource = useResource(reportApi.mine, 10000)
  const { t } = useTranslation()
  return (
    <Page
      title={t('report.title')}
      back="/menu"
      backIcon={reportAssets.back}
      className="report-page report-landing"
    >
      <div className="page-pad !gap-3">
        <Card className="p-4">
          <h2 className="text-sm font-bold">{t('report.beforeTitle')}</h2>
          <ol className="mt-1.5 list-decimal space-y-3 pl-[18px] text-xs font-medium">
            <li>{t('report.before1')}</li>
            <li>{t('report.before2')}</li>
          </ol>
        </Card>
        <a className="primary-button green-gradient gap-2" href={controlRoomTel}>
          <Asset src={reportAssets.phone} />
          {t('report.call')}
        </a>
        <Link className="primary-button green-gradient gap-2" to="/map?facility=상황실">
          <Asset src={reportAssets.location} />
          {t('report.location')}
        </Link>
        <ReportLegend />
        <section className="flex flex-col gap-2">
          <ReportHeading>{t('report.mine')}</ReportHeading>
          <RequestState
            loading={resource.loading}
            error={resource.error}
            retry={() => void resource.refresh()}
          />
          {resource.data &&
            (resource.data.length ? (
              <ReportRows reports={resource.data} />
            ) : (
              <EmptyState>{t('report.noneYet')}</EmptyState>
            ))}
        </section>
      </div>
      <BottomActions>
        <Link className="primary-button green-gradient" to="/report/new">
          {t('report.submit')}
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
  // 분실물센터에서 넘어오면 ?category=LOST_ITEM 으로 유형이 선택된 채 열린다.
  const [params] = useSearchParams()
  const [form, setForm] = useState(() => {
    const category = params.get('category') as ReportCategory | null
    return category && category in reportCategories ? { ...initial, category } : initial
  })
  const [cancel, setCancel] = useState(false)
  const action = useAction()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const label = useLabel()
  const update = <K extends keyof ReportInput>(key: K, value: ReportInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))
  return (
    <Page
      title={t('report.title')}
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
          <section className="report-field" aria-label={t('report.type')}>
            <ReportHeading>{t('report.type')}</ReportHeading>
            <Chips
              options={Object.values(reportCategories)}
              value={reportCategories[form.category]}
              format={label}
              onChange={(label) => {
                const category = (Object.keys(reportCategories) as ReportCategory[]).find(
                  (key) => reportCategories[key] === label,
                )
                if (category) update('category', category)
              }}
            />
          </section>
          {(
            [
              ['title', t('report.fieldTitle'), 30, t('report.fieldTitlePh')],
              ['reporterName', t('report.fieldName'), 10, t('report.fieldNamePh')],
              ['phoneNumber', t('report.fieldPhone'), 11, t('report.fieldPhonePh')],
              ['place', t('report.fieldPlace'), 50, t('report.fieldPlacePh')],
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
            <ReportHeading>{t('report.content')}</ReportHeading>
            <textarea
              required
              maxLength={300}
              className="form-control report-control !min-h-[132px]"
              placeholder={t('report.contentPh')}
              value={form.content}
              onChange={(e) => update('content', e.target.value)}
            />
            <span className="text-right text-xs text-muted">{form.content.length}/300</span>
          </label>
          <section className="report-field">
            <ReportHeading>{t('report.privacy')}</ReportHeading>
            <Card className="report-value">{t('report.privacyBody')}</Card>
            <label className="relative ml-auto flex w-fit items-center justify-end gap-2 text-sm text-[#8b8b8b]">
              <input
                type="checkbox"
                required
                className="peer absolute left-0 z-10 size-[22px] cursor-pointer opacity-0"
                checked={form.privacyConsent}
                onChange={(e) => update('privacyConsent', e.target.checked)}
              />
              {/* 아이콘을 마스크로 써서 체크 시 회색 → 브랜드 초록으로 채운다 */}
              <span
                aria-hidden
                className="size-[22px] shrink-0 rounded-full bg-[#8b8b8b] opacity-50 transition-[background-color,opacity] peer-checked:bg-brand peer-checked:opacity-100 peer-focus-visible:outline-2"
                style={{
                  mask: `url(${reportAssets.check}) center / contain no-repeat`,
                  WebkitMask: `url(${reportAssets.check}) center / contain no-repeat`,
                }}
              />
              <span className="transition-colors peer-checked:text-brand">{t('report.agree')}</span>
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
            {action.pending ? t('report.submitting') : t('report.submit')}
          </Button>
          <Button tone="gray" disabled={action.pending} onClick={() => setCancel(true)}>
            {t('report.cancel')}
          </Button>
        </div>
      </BottomActions>
      <ConfirmDialog
        open={cancel}
        title={t('report.stopTitle')}
        onClose={() => setCancel(false)}
        onConfirm={() => navigate('/report')}
        confirmLabel={t('report.stop')}
        cancelLabel={t('report.goBack')}
      >
        {t('report.stopBody1')}
        <br />
        {t('report.stopBody2')}
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
  const { t } = useTranslation()
  return (
    <Page
      title={t('report.title')}
      back="/report"
      backIcon={reportAssets.back}
      className="report-page"
    >
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
                <ReportHeading>{t('report.handled')}</ReportHeading>
                <Card className="report-value whitespace-pre-wrap">{report.adminNote}</Card>
              </section>
            )}
            {report.status === 'SUBMITTED' && (
              <Button tone="gray" disabled={action.pending} onClick={() => setCancel(true)}>
                {t('report.cancelReport')}
              </Button>
            )}
          </>
        )}
      </div>
      <ConfirmDialog
        open={cancel}
        title={t('report.cancelTitle')}
        onClose={() => setCancel(false)}
        onConfirm={() => {
          setCancel(false)
          void action.run(async () => {
            await reportApi.cancel(id)
            await resource.refresh()
          })
        }}
        confirmLabel={t('report.cancelReport')}
        cancelLabel={t('report.keep')}
      >
        {t('report.cancelAsk')}
      </ConfirmDialog>
    </Page>
  )
}
