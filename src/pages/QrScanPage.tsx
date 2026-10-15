import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type QrScanner from 'qr-scanner'
import { Page } from '../components/layout'
import { Button } from '../components/ui'
import { useBoothApi } from '../hooks/useBoothApi'
import { errorMessage } from '../apis/axios'

function boothCodeFromQr(value: string) {
  const url = new URL(value, window.location.origin)
  if (
    ![window.location.origin, 'https://kufim-fe.vercel.app'].includes(url.origin) ||
    url.search ||
    url.hash
  )
    throw new Error('이 축제의 부스 QR 코드가 아닙니다. 부스에 게시된 QR 코드를 스캔해 주세요.')
  const match = /^\/w\/([^/]+)\/?$/.exec(url.pathname)
  if (!match)
    throw new Error('웨이팅 접수용 QR 코드가 아닙니다. 부스 QR 코드를 다시 확인해 주세요.')
  return decodeURIComponent(match[1])
}

function cameraMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return '카메라 권한이 필요합니다. 브라우저 설정에서 카메라를 허용한 뒤 다시 시도해 주세요.'
  if (name === 'NotFoundError' || String(error).includes('not found'))
    return '사용할 수 있는 카메라가 없습니다. 카메라가 있는 기기에서 이용해 주세요.'
  return '카메라를 실행하지 못했습니다. 다른 앱에서 카메라를 사용 중인지 확인한 뒤 다시 시도해 주세요.'
}

export default function QrScanPage() {
  const video = useRef<HTMLVideoElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const [attempt, setAttempt] = useState(0)
  const [cameraError, setCameraError] = useState('')
  const [scanError, setScanError] = useState('')
  const [checking, setChecking] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let disposed = false
    let scanner: QrScanner | undefined
    let stream: MediaStream | undefined
    const element = video.current!
    let processing = false
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera not found')
        const { default: Scanner } = await import('qr-scanner')
        if (disposed) return
        // Request directly so permission errors retain their browser error names.
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' } },
        })
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        element.srcObject = stream
        scanner = new Scanner(
          element,
          async ({ data }) => {
            if (disposed || processing) return
            processing = true
            scanner?.stop()
            setChecking(true)
            try {
              const code = boothCodeFromQr(data)
              const booth = (await useBoothApi.findByCode(code)).data.data
              if (!disposed) navigate(`/waiting/register/${booth.boothId}`, { replace: true })
            } catch (error) {
              if (!disposed) setScanError(errorMessage(error))
            } finally {
              if (!disposed) setChecking(false)
            }
          },
          {
            preferredCamera: 'environment',
            maxScansPerSecond: 8,
            returnDetailedScanResult: true,
            calculateScanRegion: (element) => {
              const box = element.getBoundingClientRect()
              const target = frame.current!.getBoundingClientRect()
              const scale = Math.max(
                box.width / element.videoWidth,
                box.height / element.videoHeight,
              )
              const offsetX = (element.videoWidth * scale - box.width) / 2
              const offsetY = (element.videoHeight * scale - box.height) / 2
              return {
                x: Math.max(0, Math.round((target.left - box.left + offsetX) / scale)),
                y: Math.max(0, Math.round((target.top - box.top + offsetY) / scale)),
                width: Math.round(target.width / scale),
                height: Math.round(target.height / scale),
                downScaledWidth: 400,
                downScaledHeight: 400,
              }
            },
          },
        )
        await scanner.start()
        if (disposed) scanner.destroy()
      } catch (error) {
        scanner?.destroy()
        stream?.getTracks().forEach((track) => track.stop())
        element.srcObject = null
        if (!disposed) setCameraError(cameraMessage(error))
      }
    }
    void start()
    return () => {
      disposed = true
      scanner?.destroy()
      stream?.getTracks().forEach((track) => track.stop())
      element.srcObject = null
    }
  }, [attempt, navigate])

  useEffect(() => {
    if (scanError && !dialog.current?.open) dialog.current?.showModal()
    else if (!scanError) dialog.current?.close()
  }, [scanError])
  const retryCamera = () => {
    setCameraError('')
    setAttempt((value) => value + 1)
  }
  const scanAgain = () => {
    setScanError('')
    retryCamera()
  }

  return (
    <Page
      title="QR 웨이팅"
      back="/waiting"
      backIcon="/assets/figma/scanner/back.svg"
      className="qr-scanner-page !min-h-0 h-[calc(100dvh-68px)] overflow-hidden !bg-black text-white"
    >
      <video
        key={attempt}
        ref={video}
        aria-label="부스 QR 스캔 카메라"
        muted
        playsInline
        className="absolute inset-0 h-full w-full rounded-t-xl object-cover"
      />
      <div className="pointer-events-none absolute top-[28.07%] left-1/2 flex w-[min(258px,calc(100%-80px))] -translate-x-1/2 flex-col items-center gap-5">
        <div
          ref={frame}
          role="img"
          aria-label="QR 인식 영역"
          className="aspect-square w-full border-4 border-solid border-white"
        />
        <p role="status" className="w-full text-center text-sm font-bold">
          {checking
            ? '부스 QR 코드를 확인하고 있습니다.'
            : 'QR 코드를 사각형 내부에 정확히 인식해주세요.'}
        </p>
      </div>
      {cameraError && (
        <div className="absolute inset-x-5 top-8 flex flex-col gap-3 rounded-xl bg-black/80 p-4 text-center">
          <p role="alert" className="text-sm">
            {cameraError}
          </p>
          <Button onClick={retryCamera}>카메라 다시 시도</Button>
        </div>
      )}
      <Link
        to="/waiting"
        className="primary-button absolute right-5 bottom-5 left-5 !w-auto bg-[#bcbcbc] !text-[#2a2a2a]"
        style={{ bottom: 'max(20px, env(safe-area-inset-bottom))' }}
      >
        돌아가기
      </Link>
      <dialog
        ref={dialog}
        aria-labelledby="scan-error-title"
        className="confirm-dialog text-black"
        onCancel={(event) => {
          event.preventDefault()
          scanAgain()
        }}
      >
        <h2 id="scan-error-title" className="text-center text-xl font-bold">
          QR 코드 확인
        </h2>
        <p className="my-3 text-center text-sm">{scanError}</p>
        <Button onClick={scanAgain}>다시 스캔하기</Button>
      </dialog>
    </Page>
  )
}
