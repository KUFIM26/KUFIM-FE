import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BottomActions, Page } from '../components/layout'
import { Button, Card, Chips, ConfirmDialog, EmptyState } from '../components/ui'
import { RequestState } from '../components/RequestState'
import { ReportHeading } from '../components/report'
import { AdminLostItemRows, LostItemFacts, LostItemSummary } from '../components/lostItem'
import {
  LOST_ITEM_IMAGE_MAX_BYTES,
  LOST_ITEM_IMAGE_TYPES,
  lostItemApi,
  lostItemCategories,
  lostItemStatuses,
  lostItemVerifications,
  sensitiveCategories,
  shrinkImage,
  toSeoulIso,
  toSeoulLocal,
} from '../apis/lostItem'
import type {
  AdminLostItem,
  LostItemCategory,
  LostItemStatus,
  LostItemVerifiedBy,
} from '../apis/lostItem'
import { reportAssets, reportDate } from '../data/report-design'
import { useAction, useResource } from '../hooks/useResource'

const ALL = '전체'
const keyOf = <K extends string>(labels: Record<K, string>, label: string) =>
  (Object.keys(labels) as K[]).find((key) => labels[key] === label)

export function AdminLostItemListPage() {
  const [category, setCategory] = useState<LostItemCategory | ''>('')
  const [status, setStatus] = useState<LostItemStatus | ''>('')
  const [page, setPage] = useState(0)
  const loader = useCallback(
    () => lostItemApi.adminList({ category, status, page }),
    [category, status, page],
  )
  const resource = useResource(loader, 10000)
  const data = resource.data
  const counts = [
    ['보관 중', 'lost-status-STORED', data?.summary.stored],
    ['인계 완료', 'lost-status-RETURNED', data?.summary.returned],
    ['전체', 'report-status-SUBMITTED', data?.summary.total],
  ] as const
  return (
    <Page
      title="분실물센터"
      back="/admin"
      backIcon={reportAssets.back}
      className="report-page report-admin-list lost-page"
    >
      <div className="page-pad !gap-4">
        <Card className="report-counts lost-counts">
          <div className="report-counts-grid" aria-label="습득물 상태별 건수">
            {counts.map(([label, tone, count]) => (
              <div key={label} className="report-count-cell">
                <span className={`report-badge ${tone}`}>{label}</span>
                <span className="report-count-number">
                  {count === undefined ? '—' : String(count).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
        </Card>
        <section className="flex flex-col gap-2">
          <ReportHeading>등록된 습득물</ReportHeading>
          <Chips
            options={[ALL, ...Object.values(lostItemCategories)]}
            value={category ? lostItemCategories[category] : ALL}
            onChange={(label) => {
              setCategory(keyOf(lostItemCategories, label) || '')
              setPage(0)
            }}
          />
          <Chips
            compact
            options={[ALL, ...Object.values(lostItemStatuses)]}
            value={status ? lostItemStatuses[status] : ALL}
            onChange={(label) => {
              setStatus(keyOf(lostItemStatuses, label) || '')
              setPage(0)
            }}
          />
          <RequestState
            loading={resource.loading}
            error={resource.error}
            retry={() => void resource.refresh()}
          />
          {data &&
            (data.content.length ? (
              <AdminLostItemRows items={data.content} />
            ) : (
              <EmptyState>해당 조건의 습득물이 없습니다.</EmptyState>
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
        </section>
      </div>
      <BottomActions>
        <Link className="primary-button green-gradient" to="/admin/lost-items/new">
          습득물 등록
        </Link>
      </BottomActions>
    </Page>
  )
}

type Form = {
  category: LostItemCategory | ''
  name: string
  foundPlace: string
  foundAt: string
  storagePlace: string
  description: string
  imagePublic: boolean
}
const emptyForm: Form = {
  category: '',
  name: '',
  foundPlace: '',
  foundAt: '',
  storagePlace: '상황실',
  description: '',
  imagePublic: true,
}
/** 사진 상태. url: 화면에 보일 주소, file: 새로 골라 아직 올리지 않은 사진. 둘 다 없으면 사진 없음 */
type Photo = { file?: Blob; url?: string }

export function AdminLostItemFormPage() {
  const { id } = useParams()
  const loader = useCallback(async () => (id ? await lostItemApi.adminFind(id) : null), [id])
  const resource = useResource(loader)
  return (
    <Page
      title={id ? '습득물 수정' : '습득물 등록'}
      back={id ? `/admin/lost-items/${id}` : '/admin/lost-items'}
      backIcon={reportAssets.back}
      className="report-page report-form lost-page"
    >
      <RequestState
        loading={resource.loading}
        error={resource.error}
        retry={() => void resource.refresh()}
      />
      {resource.data !== undefined && <ItemForm key={id || 'new'} item={resource.data} />}
    </Page>
  )
}

function ItemForm({ item }: { item: AdminLostItem | null }) {
  const navigate = useNavigate()
  const action = useAction()
  const [form, setForm] = useState<Form>(() =>
    item
      ? {
          category: item.category,
          name: item.name,
          foundPlace: item.foundPlace || '',
          foundAt: item.foundAt ? toSeoulLocal(item.foundAt) : '',
          storagePlace: item.storagePlace || '상황실',
          description: item.description || '',
          imagePublic: item.imagePublic,
        }
      : emptyForm,
  )
  const [photo, setPhoto] = useState<Photo>({ url: item?.imageUrl || undefined })
  const [photoError, setPhotoError] = useState('')
  const [cancel, setCancel] = useState(false)
  // 새로 고른 사진의 미리보기 주소는 바꾸거나 지울 때 해제한다.
  const replacePhoto = (next: Photo) => {
    if (photo.file && photo.url) URL.revokeObjectURL(photo.url)
    setPhoto(next)
  }
  const update = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }))
  const sensitive = !!form.category && sensitiveCategories.includes(form.category)
  const shown = photo.url
  const pick = async (file?: File) => {
    if (!file) return
    setPhotoError('')
    if (!LOST_ITEM_IMAGE_TYPES.includes(file.type))
      return setPhotoError('JPG, PNG, WebP 사진만 올릴 수 있습니다.')
    const blob = await shrinkImage(file)
    if (blob.size > LOST_ITEM_IMAGE_MAX_BYTES)
      return setPhotoError('사진은 5MB 이하만 올릴 수 있습니다.')
    replacePhoto({ file: blob, url: URL.createObjectURL(blob) })
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!form.category) return
    const category = form.category
    void action.run(async () => {
      // 사진을 먼저 올리고, 받은 키를 등록 요청에 싣는다.
      const imageKey = photo.file
        ? (await lostItemApi.uploadImage(photo.file)).imageKey
        : photo.url
          ? undefined
          : null
      const input = {
        category,
        name: form.name.trim(),
        foundPlace: form.foundPlace.trim(),
        foundAt: toSeoulIso(form.foundAt),
        storagePlace: form.storagePlace.trim() || '상황실',
        description: form.description.trim(),
        imagePublic: sensitive ? false : form.imagePublic,
        ...(imageKey === undefined ? {} : { imageKey }),
      }
      const saved = item
        ? await lostItemApi.update(String(item.lostItemId), input)
        : await lostItemApi.create(input)
      navigate(`/admin/lost-items/${saved.lostItemId}`, { replace: true })
    })
  }
  return (
    <>
      <form id="lost-item-form" className="page-pad !gap-5" onSubmit={submit}>
        <fieldset disabled={action.pending} className="flex min-w-0 flex-col gap-5">
          <section className="report-field">
            <ReportHeading>사진</ReportHeading>
            {shown ? (
              <div className="lost-photo">
                <label className="block size-full cursor-pointer">
                  <img src={shown} alt="고른 사진. 누르면 다른 사진으로 바꿉니다." />
                  <input
                    type="file"
                    accept={LOST_ITEM_IMAGE_TYPES.join(',')}
                    className="sr-only"
                    onChange={(e) => void pick(e.target.files?.[0])}
                  />
                </label>
                <button
                  type="button"
                  aria-label="사진 지우기"
                  className="absolute top-2.5 right-2.5 flex size-[26px] items-center justify-center rounded-full bg-[#1a1a1a] text-sm font-bold text-white"
                  onClick={() => replacePhoto({})}
                >
                  ×
                </button>
              </div>
            ) : (
              <label className="lost-photo-add">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 8h3l1.5-2h7L17 8h3v11H4Z" />
                  <circle cx="12" cy="13" r="3.2" />
                </svg>
                사진 추가
                <span className="text-[11px] font-medium text-[#6b6b6b]">1장, 5MB 이하</span>
                <input
                  type="file"
                  accept={LOST_ITEM_IMAGE_TYPES.join(',')}
                  className="sr-only"
                  onChange={(e) => void pick(e.target.files?.[0])}
                />
              </label>
            )}
            {photoError && (
              <p role="alert" className="text-xs text-danger">
                {photoError}
              </p>
            )}
          </section>
          <section className="report-field" aria-label="분류">
            <ReportHeading>분류</ReportHeading>
            <Chips
              options={Object.values(lostItemCategories)}
              value={form.category ? lostItemCategories[form.category] : ''}
              onChange={(label) => update('category', keyOf(lostItemCategories, label) || '')}
            />
          </section>
          <label className="report-field">
            <ReportHeading>물품명</ReportHeading>
            <input
              className="form-control report-control"
              required
              maxLength={30}
              pattern=".*\S.*"
              placeholder="30자 이내"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
            {sensitive && (
              <span className="text-xs text-muted">
                이름은 가운데를 가려 적어 주세요(예: 김*국 학생증). 학번·카드번호는 적지 않습니다.
              </span>
            )}
          </label>
          <label className="report-field">
            <ReportHeading>습득 장소</ReportHeading>
            <input
              className="form-control report-control"
              required
              maxLength={50}
              pattern=".*\S.*"
              placeholder="50자 이내"
              value={form.foundPlace}
              onChange={(e) => update('foundPlace', e.target.value)}
            />
          </label>
          <label className="report-field">
            <ReportHeading>습득 일시</ReportHeading>
            <input
              type="datetime-local"
              className="form-control report-control"
              required
              max={toSeoulLocal(new Date())}
              value={form.foundAt}
              onChange={(e) => update('foundAt', e.target.value)}
            />
          </label>
          <label className="report-field">
            <ReportHeading>보관 장소</ReportHeading>
            <input
              className="form-control report-control"
              maxLength={30}
              placeholder="30자 이내"
              value={form.storagePlace}
              onChange={(e) => update('storagePlace', e.target.value)}
            />
          </label>
          <label className="report-field">
            <ReportHeading>특징</ReportHeading>
            <textarea
              className="form-control report-control !min-h-[100px]"
              maxLength={300}
              placeholder="300자 이내"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
            <span className="text-right text-xs text-muted">{form.description.length}/300</span>
          </label>
          <Card className="report-value">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span>
                <b className="block text-sm">사진 공개</b>
                <span className="mt-1 block text-[11px] font-medium text-[#6b6b6b]">
                  신분증·카드는 자동으로 비공개 처리됩니다
                </span>
              </span>
              <input
                type="checkbox"
                className="sr-only"
                disabled={sensitive}
                checked={!sensitive && form.imagePublic}
                onChange={(e) => update('imagePublic', e.target.checked)}
              />
              <span className="lost-switch" aria-hidden />
            </label>
          </Card>
        </fieldset>
        <RequestState error={action.error} />
      </form>
      <BottomActions>
        <div className="flex gap-2">
          <Button type="submit" form="lost-item-form" disabled={action.pending || !form.category}>
            {action.pending ? '저장 중…' : item ? '저장하기' : '등록하기'}
          </Button>
          <Button tone="gray" disabled={action.pending} onClick={() => setCancel(true)}>
            취소하기
          </Button>
        </div>
      </BottomActions>
      <ConfirmDialog
        open={cancel}
        title={item ? '수정 중단하기' : '등록 중단하기'}
        onClose={() => setCancel(false)}
        onConfirm={() =>
          navigate(item ? `/admin/lost-items/${item.lostItemId}` : '/admin/lost-items')
        }
        confirmLabel="중단하기"
        cancelLabel="돌아가기"
      >
        입력하신 내용이 저장되지 않습니다.
        <br />
        중단하시겠습니까?
      </ConfirmDialog>
    </>
  )
}

/** 인계 완료 처리 팝업: 물건을 찾아간 사람의 정보를 남긴다. */
function ReturnDialog({
  open,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean
  pending: boolean
  onClose: () => void
  onSubmit: (input: {
    receiverName: string
    receiverPhone?: string
    verifiedBy: LostItemVerifiedBy
    returnNote?: string
  }) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [verifiedBy, setVerifiedBy] = useState<LostItemVerifiedBy>('STUDENT_ID')
  const [note, setNote] = useState('')
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal()
    else if (!open) ref.current?.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      className="confirm-dialog lost-dialog"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit({
            receiverName: name.trim(),
            receiverPhone: phone || undefined,
            verifiedBy,
            returnNote: note.trim() || undefined,
          })
        }}
      >
        <h2 id={id} className="text-center text-xl font-bold">
          인계 완료 처리
        </h2>
        <p className="text-center text-sm">물건을 찾아간 분의 정보를 남겨 주세요.</p>
        <label className="report-field text-sm font-bold">
          수령인 이름
          <input
            className="form-control report-control"
            required
            maxLength={10}
            pattern=".*\S.*"
            placeholder="10자 이내"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="report-field text-sm font-bold">
          연락처 (선택)
          <input
            className="form-control report-control"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]{11}"
            placeholder="숫자 11자리"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
          />
        </label>
        <div className="report-field text-sm font-bold">
          본인 확인
          <Chips
            options={Object.values(lostItemVerifications)}
            value={lostItemVerifications[verifiedBy]}
            onChange={(label) => setVerifiedBy(keyOf(lostItemVerifications, label) || 'STUDENT_ID')}
          />
        </div>
        <label className="report-field text-sm font-bold">
          메모 (선택)
          <input
            className="form-control report-control"
            maxLength={100}
            placeholder="100자 이내"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <div className="mt-1 flex justify-center gap-3">
          <Button
            tone="gray"
            className="!min-h-10 !w-[132px] !py-2 !text-base"
            disabled={pending}
            onClick={onClose}
          >
            취소
          </Button>
          <Button
            type="submit"
            className="!min-h-10 !w-[132px] !py-2 !text-base"
            disabled={pending}
          >
            완료 처리
          </Button>
        </div>
      </form>
    </dialog>
  )
}

export function AdminLostItemDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const loader = useCallback(() => lostItemApi.adminFind(id), [id])
  const resource = useResource(loader)
  const action = useAction()
  const [dialog, setDialog] = useState<'return' | 'reopen' | 'delete' | ''>('')
  const [contact, setContact] = useState<{ id: string; value: string } | null>(null)
  const [message, setMessage] = useState('')
  const phone = contact?.id === id ? contact.value : ''
  const item = resource.data
  const returned = item?.status === 'RETURNED'
  const run = (work: () => Promise<unknown>, done: string) =>
    void action.run(async () => {
      await work()
      setDialog('')
      setContact(null)
      setMessage(done)
      await resource.refresh()
    })
  return (
    <Page
      title="습득물 상세"
      back="/admin/lost-items"
      backIcon={reportAssets.back}
      className="report-page report-admin-detail lost-page"
    >
      <div className="page-pad !gap-3">
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
        {item && (
          <>
            {item.imageUrl && (
              <div className={`lost-photo !h-[180px] ${returned ? 'opacity-55' : ''}`}>
                <img src={item.imageUrl} alt={`${item.name} 사진`} />
                <span className="absolute right-2.5 bottom-2.5 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {item.imagePublic && !returned ? '공개 중' : '비공개'}
                </span>
              </div>
            )}
            <LostItemSummary item={item}>
              {returned
                ? `인계 완료　|　${item.returnedAt ? reportDate(item.returnedAt) : ''}`
                : `보관 중${item.registeredBy ? `　|　등록 ${item.registeredBy.name}` : ''}`}
            </LostItemSummary>
            {!returned && (
              <div className="flex justify-end gap-3.5 text-xs font-bold">
                <Link to={`/admin/lost-items/${id}/edit`} className="text-brand">
                  수정
                </Link>
                <button
                  type="button"
                  className="text-[#c62828]"
                  disabled={action.pending}
                  onClick={() => setDialog('delete')}
                >
                  삭제
                </button>
              </div>
            )}
            {returned && (
              <section className="report-field">
                <ReportHeading>인계 정보</ReportHeading>
                <LostItemFacts
                  rows={[
                    ['수령인', item.receiverName],
                    [
                      '연락처',
                      item.receiverPhoneMasked && (
                        <span key="phone" className="flex items-center justify-between gap-2">
                          {phone || item.receiverPhoneMasked}
                          {!phone && (
                            <button
                              type="button"
                              className="text-[11px] font-bold text-brand underline"
                              disabled={action.pending}
                              onClick={() =>
                                void action.run(async () =>
                                  setContact({
                                    id,
                                    value: (await lostItemApi.contact(id)).phoneNumber,
                                  }),
                                )
                              }
                            >
                              연락처 보기
                            </button>
                          )}
                        </span>
                      ),
                    ],
                    ['본인 확인', item.verifiedBy && lostItemVerifications[item.verifiedBy]],
                    ['인계 시각', item.returnedAt && reportDate(item.returnedAt)],
                    ['처리자', item.returnedBy?.name],
                    ['메모', item.returnNote],
                  ]}
                />
              </section>
            )}
            <section className="report-field">
              <ReportHeading>습득 정보</ReportHeading>
              <LostItemFacts
                rows={[
                  ['습득 장소', item.foundPlace],
                  ['습득 일시', item.foundAt && reportDate(item.foundAt)],
                  ['보관 장소', item.storagePlace],
                ]}
              />
            </section>
            {item.description && (
              <section className="report-field">
                <ReportHeading>특징</ReportHeading>
                <Card className="report-value whitespace-pre-wrap">{item.description}</Card>
              </section>
            )}
          </>
        )}
      </div>
      {item && (
        <BottomActions>
          {returned ? (
            <Button tone="gray" disabled={action.pending} onClick={() => setDialog('reopen')}>
              인계 취소
            </Button>
          ) : (
            <Button disabled={action.pending} onClick={() => setDialog('return')}>
              인계 완료 처리
            </Button>
          )}
        </BottomActions>
      )}
      {item && !returned && (
        <ReturnDialog
          open={dialog === 'return'}
          pending={action.pending}
          onClose={() => setDialog('')}
          onSubmit={(input) =>
            run(() => lostItemApi.giveBack(id, input), '인계 완료로 처리했습니다.')
          }
        />
      )}
      <ConfirmDialog
        open={dialog === 'reopen'}
        title="인계 취소"
        onClose={() => setDialog('')}
        onConfirm={() => run(() => lostItemApi.reopen(id), '보관 중으로 되돌렸습니다.')}
        confirmLabel="인계 취소"
        cancelLabel="돌아가기"
      >
        보관 중으로 되돌리시겠습니까?
        <br />
        수령인 정보가 지워집니다.
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === 'delete'}
        title="습득물 삭제"
        onClose={() => setDialog('')}
        onConfirm={() => {
          setDialog('')
          void action.run(async () => {
            await lostItemApi.remove(id)
            navigate('/admin/lost-items', { replace: true })
          })
        }}
        confirmLabel="삭제하기"
        cancelLabel="돌아가기"
      >
        이 습득물을 삭제하시겠습니까?
        <br />
        삭제하면 되돌릴 수 없습니다.
      </ConfirmDialog>
    </Page>
  )
}
