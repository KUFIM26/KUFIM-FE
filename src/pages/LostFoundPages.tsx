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
      title="분실물센터"
      back="/menu"
      backIcon={reportAssets.back}
      className="report-page lost-page"
    >
      <div className="page-pad !gap-3">
        <Card className="lost-guide">
          <p className="text-[13px] leading-normal font-semibold">
            습득물은 상황실에서 보관합니다.
            <br />
            본인 확인 후 찾아가실 수 있어요.
          </p>
          <dl>
            <dt>보관 장소</dt>
            <dd>상황실</dd>
            <dt>운영 시간</dt>
            <dd>축제 운영 시간과 동일</dd>
            <dt>축제 종료 후</dt>
            <dd>남은 물건은 총학생회로 이관</dd>
          </dl>
        </Card>
        <Chips
          options={[ALL, ...Object.values(lostItemCategories)]}
          value={category ? lostItemCategories[category] : ALL}
          onChange={(label) => {
            setCategory(categoryOf(label))
            setPage(0)
          }}
        />
        <input
          type="search"
          className="form-control report-control"
          aria-label="습득물 검색"
          placeholder="물건 이름, 장소로 검색"
          maxLength={30}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex items-center justify-between text-xs font-semibold text-[#6b6b6b]">
          <span>{data ? `습득물 ${data.totalElements}건` : ''}</span>
          <label className="flex cursor-pointer items-center gap-2">
            보관 중만 보기
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
              <b className="block text-sm text-[#1a1a1a]">조건에 맞는 습득물이 없어요</b>
              <span className="mt-1.5 block text-xs">
                찾는 물건이 없다면 분실 신고를 남겨주세요.
              </span>
            </EmptyState>
          ))}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <Button disabled={!page} onClick={() => setPage((p) => p - 1)}>
              이전
            </Button>
            <span className="shrink-0 px-3">
              {page + 1}/{data.totalPages}
            </span>
            <Button disabled={page + 1 >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
              다음
            </Button>
          </div>
        )}
      </div>
      <BottomActions>
        <Link className="primary-button green-gradient" to="/report/new?category=LOST_ITEM">
          분실 신고하기
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
  const item = resource.data
  return (
    <Page
      title="습득물 상세"
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
              <b className="block text-sm text-[#1a1a1a]">찾을 수 없는 습득물이에요</b>
              <span className="mt-1.5 block text-xs">
                이미 주인에게 돌아갔거나 삭제된 물건입니다.
              </span>
            </EmptyState>
            <BackToList to="/lost-found" />
          </>
        )}
        {item && (
          <>
            {/* 사진이 비공개이거나 없으면 자리 자체를 두지 않는다 */}
            {item.imageUrl && (
              <div className="lost-photo">
                <img src={item.imageUrl} alt={`${item.name} 사진`} />
              </div>
            )}
            <LostItemSummary item={item}>보관 중　|　상황실에서 찾아가실 수 있어요</LostItemSummary>
            {(
              [
                ['습득 장소', item.foundPlace],
                ['습득 일시', item.foundAt && reportDate(item.foundAt)],
                ['보관 장소', item.storagePlace],
                ['특징', item.description],
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
              <ReportHeading>찾으러 오실 때</ReportHeading>
              <Card className="lost-guide">
                <ol>
                  <li>학생증 또는 신분증 지참</li>
                  <li>물건의 특징을 설명해 주세요</li>
                  <li>축제 운영 시간 안에 상황실 방문</li>
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
              상황실 위치 보기
            </Link>
            <a
              className="primary-button border border-brand bg-white !text-base !text-brand"
              href={controlRoomTel}
            >
              상황실 전화하기
            </a>
          </div>
        </BottomActions>
      )}
    </Page>
  )
}
