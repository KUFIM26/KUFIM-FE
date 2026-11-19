import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BottomActions, Page } from '../components/layout'
import { BackToList, Button, Card, Chips, EmptyState } from '../components/ui'
import { RequestState } from '../components/RequestState'
import { ReportHeading } from '../components/report'
import { LostItemGrid, LostItemSummary } from '../components/lostItem'
import { lostItemApi, lostItemCategories } from '../apis/lostItem'
import type { LostItemCategory } from '../apis/lostItem'
import { isNotFound } from '../apis/axios'
import { controlRoomTel, reportAssets, reportDate } from '../data/report-design'
import { useResource } from '../hooks/useResource'
import { useTranslation } from 'react-i18next'
import { useLabel } from '../i18n/label'

const ALL = '전체'
const categoryOf = (label: string) =>
  (Object.keys(lostItemCategories) as LostItemCategory[]).find(
    (key) => lostItemCategories[key] === label,
  ) || ''

export function LostFoundPage() {
  const [category, setCategory] = useState<LostItemCategory | ''>('')
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const [storedOnly, setStoredOnly] = useState(true)
  const [page, setPage] = useState(0)
  const { t } = useTranslation()
  const label = useLabel()
  // 입력이 멈춘 뒤에만 검색한다. 서버는 2자 이상만 받는다.
  useEffect(() => {
    const next = text.trim().length >= 2 ? text.trim() : ''
    const timer = window.setTimeout(() => {
      setQ(next)
      setPage(0)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [text])
  const loader = useCallback(
    () => lostItemApi.list({ category, q, status: storedOnly ? '' : 'ALL', page }),
    [category, q, storedOnly, page],
  )
  // 방문자 목록은 자동 갱신하지 않는다(들어올 때·새로고침할 때만 조회).
  const resource = useResource(loader)
  const data = resource.data
  return (
    <Page
      title={t('lost.title')}
      back="/menu"
      backIcon={reportAssets.back}
      className="report-page lost-page"
    >
      <div className="page-pad !gap-3">
        <Card className="lost-guide">
          <p className="text-[13px] leading-normal font-semibold">
            {t('lost.guide1')}
            <br />
            {t('lost.guide2')}
          </p>
          <dl>
            <dt>{t('lost.storage')}</dt>
            <dd>{t('lost.controlRoom')}</dd>
            <dt>{t('lost.hours')}</dt>
            <dd>{t('lost.sameAsFestival')}</dd>
            <dt>{t('lost.afterFestival')}</dt>
            <dd>{t('lost.handover')}</dd>
          </dl>
        </Card>
        <Chips
          options={[ALL, ...Object.values(lostItemCategories)]}
          value={category ? lostItemCategories[category] : ALL}
          format={label}
          onChange={(label) => {
            setCategory(categoryOf(label))
            setPage(0)
          }}
        />
        <input
          type="search"
          className="form-control report-control"
          aria-label={t('lost.search')}
          placeholder={t('lost.searchPh')}
          maxLength={30}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex items-center justify-between text-xs font-semibold text-[#6b6b6b]">
          <span>{data ? t('lost.count', { n: data.totalElements }) : ''}</span>
          <label className="flex cursor-pointer items-center gap-2">
            {t('lost.storedOnly')}
            <input
              type="checkbox"
              className="sr-only"
              checked={storedOnly}
              onChange={(e) => {
                setStoredOnly(e.target.checked)
                setPage(0)
              }}
            />
            <span className="lost-switch" aria-hidden />
          </label>
        </div>
        <RequestState
          loading={resource.loading}
          error={resource.error}
          retry={() => void resource.refresh()}
        />
        {data &&
          (data.content.length ? (
            <LostItemGrid items={data.content} />
          ) : (
            <EmptyState>
              <b className="block text-sm text-[#1a1a1a]">{t('lost.emptyTitle')}</b>
              <span className="mt-1.5 block text-xs">{t('lost.emptyBody')}</span>
            </EmptyState>
          ))}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <Button disabled={!page} onClick={() => setPage((p) => p - 1)}>
              {t('ui.prev')}
            </Button>
            <span className="shrink-0 px-3">
              {page + 1}/{data.totalPages}
            </span>
            <Button disabled={page + 1 >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
              {t('ui.next')}
            </Button>
          </div>
        )}
      </div>
      <BottomActions>
        <Link className="primary-button green-gradient" to="/report/new?category=LOST_ITEM">
          {t('lost.reportLost')}
        </Link>
      </BottomActions>
    </Page>
  )
}

export function LostFoundDetailPage() {
  const { id = '' } = useParams()
  // 인계가 끝난 물건은 서버가 없는 물건과 똑같이 404로 답한다. 화면도 구분하지 않는다.
  const loader = useCallback(
    () =>
      lostItemApi.find(id).catch((error) => {
        if (isNotFound(error)) return null
        throw error
      }),
    [id],
  )
  const resource = useResource(loader)
  const { t } = useTranslation()
  const item = resource.data
  return (
    <Page
      title={t('lost.detail')}
      back="/lost-found"
      backIcon={reportAssets.back}
      className="report-page lost-page"
    >
      <div className="page-pad !gap-3">
        <RequestState
          loading={resource.loading}
          error={resource.error}
          retry={() => void resource.refresh()}
        />
        {item === null && (
          <>
            <EmptyState>
              <b className="block text-sm text-[#1a1a1a]">{t('lost.missingTitle')}</b>
              <span className="mt-1.5 block text-xs">{t('lost.missingBody')}</span>
            </EmptyState>
            <BackToList to="/lost-found" />
          </>
        )}
        {item && (
          <>
            {/* 사진이 비공개이거나 없으면 자리 자체를 두지 않는다 */}
            {item.imageUrl && (
              <div className="lost-photo">
                <img src={item.imageUrl} alt={t('lost.photoOf', { name: item.name })} />
              </div>
            )}
            <LostItemSummary item={item}>{t('lost.storedNote')}</LostItemSummary>
            {(
              [
                [t('lost.foundPlace'), item.foundPlace],
                [t('lost.foundAt'), item.foundAt && reportDate(item.foundAt)],
                [t('lost.storage'), item.storagePlace],
                [t('lost.description'), item.description],
              ] as const
            ).map(
              ([label, value]) =>
                value && (
                  <section key={label} className="report-field">
                    <ReportHeading>{label}</ReportHeading>
                    <Card className="report-value whitespace-pre-wrap">{value}</Card>
                  </section>
                ),
            )}
            <section className="report-field mt-2">
              <ReportHeading>{t('lost.pickup')}</ReportHeading>
              <Card className="lost-guide">
                <ol>
                  <li>{t('lost.pickup1')}</li>
                  <li>{t('lost.pickup2')}</li>
                  <li>{t('lost.pickup3')}</li>
                </ol>
              </Card>
            </section>
          </>
        )}
      </div>
      {item && (
        <BottomActions>
          <div className="flex gap-2">
            <Link className="primary-button green-gradient !text-base" to="/map?facility=상황실">
              {t('report.location')}
            </Link>
            <a
              className="primary-button border border-brand bg-white !text-base !text-brand"
              href={controlRoomTel}
            >
              {t('report.call')}
            </a>
          </div>
        </BottomActions>
      )}
    </Page>
  )
}
