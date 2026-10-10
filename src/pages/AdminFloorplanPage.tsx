import { useState } from 'react'
import type { FormEvent } from 'react'
import { useDemo } from '../app/demo-context'
import { useAdminSession } from '../app/admin-session'
import { Page } from '../components/layout'
import { Button, Card, EmptyState, SectionTitle } from '../components/ui'
import { FloorplanMap } from '../components/festival'
import { isApiMode } from '../api/config'
import { api } from '../api/endpoints'
import type { ApiFloorplan } from '../api/types'

// Design basemap shipped with the app; a campus floorplan can be added under public/ later.
const DEFAULT_IMAGE = '/assets/figma/53-1227-a5341.png'

// Every visitor loads this image, so only this site's files or https images are accepted.
const allowedImage = (url: string) => url.startsWith('/') || url.startsWith('https://')

export default function AdminFloorplanPage() {
  const { account } = useAdminSession()
  const { floorplan, festival, booths, refresh } = useDemo()
  const [imageUrl, setImageUrl] = useState(DEFAULT_IMAGE)
  const [preview, setPreview] = useState<ApiFloorplan | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (!isApiMode || account?.role !== 'SUPER_ADMIN')
    return (
      <Page title="축제 지도 도면" back="/admin">
        <div className="page-pad">
          <EmptyState>도면 등록은 백엔드에 연결된 화면에서 총괄 관리자만 할 수 있어요.</EmptyState>
        </div>
      </Page>
    )

  const pins = booths
    .filter((b) => b.position)
    .map((b) => ({ id: b.id, name: b.name, x: b.position!.x, y: b.position!.y }))

  const load = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setPreview(null)
    const url = imageUrl.trim()
    if (!allowedImage(url)) {
      setError('이 사이트의 파일 경로(/로 시작)나 https 주소만 사용할 수 있어요.')
      return
    }
    const image = new Image()
    image.onload = () =>
      setPreview({ imageUrl: url, width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => setError('이미지를 불러오지 못했어요. 주소를 확인해주세요.')
    image.src = url
  }
  const register = async () => {
    if (!preview || !festival) return
    setSaving(true)
    setError('')
    try {
      await api.admin.createFloorplan({ ...preview, festivalId: festival.festivalId })
      await refresh()
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page title="축제 지도 도면" back="/admin">
      <div className="page-pad">
        {floorplan ? (
          <section className="flex flex-col gap-2">
            <SectionTitle>등록된 도면</SectionTitle>
            <Card className="overflow-hidden">
              <FloorplanMap floorplan={floorplan} pins={pins} />
            </Card>
            <p className="text-xs text-muted">
              {floorplan.width}×{floorplan.height}px · 위치가 지정된 부스·시설 {pins.length}곳. 도면
              교체는 아직 지원하지 않아요. 부스·시설 위치는 각 등록·수정 화면에서 지정합니다.
            </p>
          </section>
        ) : !festival ? (
          <EmptyState>축제를 먼저 등록해주세요.</EmptyState>
        ) : (
          <>
            <form onSubmit={load} className="flex flex-col gap-2">
              <SectionTitle>도면 이미지 주소</SectionTitle>
              <div className="flex gap-2">
                <input
                  className="form-control flex-1"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  aria-label="도면 이미지 주소"
                />
                <button
                  type="submit"
                  className="rounded-[13px] bg-[#90c4ff] px-4 text-sm font-bold text-[#00153b]"
                >
                  불러오기
                </button>
              </div>
              <p className="text-xs text-muted">
                축제 하나에 도면은 한 번만 등록할 수 있어요. 크기는 이미지에서 자동으로 읽습니다.
              </p>
            </form>
            {preview && (
              <section className="flex flex-col gap-2">
                <SectionTitle>
                  미리보기 ({preview.width}×{preview.height}px)
                </SectionTitle>
                <Card className="overflow-hidden">
                  <FloorplanMap floorplan={preview} />
                </Card>
                <Button onClick={register} disabled={saving}>
                  {saving ? '등록 중…' : '이 도면으로 등록하기'}
                </Button>
              </section>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="text-center text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </Page>
  )
}
