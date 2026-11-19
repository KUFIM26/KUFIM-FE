import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type QrScanner from 'qr-scanner'
import { Page } from '../components/layout'
import { Button } from '../components/ui'
import { useBoothApi } from '../hooks/useBoothApi'
import { errorMessage } from '../apis/axios'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'

function boothFromQr(value: string) {
  const url = new URL(value, window.location.origin)
  if (
    ![window.location.origin, 'https://kufim-fe.vercel.app'].includes(url.origin) ||
    url.search ||
    url.hash
  )
    throw new Error(i18n.t('scan.foreign'))
  const code = /^\/w\/([^/]+)\/?$/.exec(url.pathname)
  if (code) return useBoothApi.findByCode(decodeURIComponent(code[1]))
  const registration = /^\/waiting\/register\/([1-9]\d*)\/?$/.exec(url.pathname)
  if (registration && Number.isSafeInteger(Number(registration[1])))
    return useBoothApi.find(Number(registration[1]))
  throw new Error(i18n.t('scan.notWaiting'))
}

function cameraMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return i18n.t('scan.needPermission')
  if (name === 'NotFoundError' || String(error).includes('not found'))
    return i18n.t('scan.noCamera')
  return i18n.t('scan.cameraFailed')
}

export default function QrScanPage() {
  const { t } = useTranslation()
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
              const booth = (await boothFromQr(data)).data.data
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
      title={t('waiting.title')}
      back="/waiting"
      backIcon="/assets/figma/scanner/back.svg"
      className="qr-scanner-page !min-h-0 h-[calc(100dvh-68px)] overflow-hidden !bg-black text-white"
    >
      <video
        key={attempt}
        ref={video}
        aria-label={t('scan.camera')}
        muted
        playsInline
        className="absolute inset-0 h-full w-full rounded-t-xl object-cover"
      />
      <div className="pointer-events-none absolute top-[28.07%] left-1/2 flex w-[min(258px,calc(100%-80px))] -translate-x-1/2 flex-col items-center gap-5">
        <div
          ref={frame}
          role="img"
          aria-label={t('scan.frame')}
          className="aspect-square w-full border-4 border-solid border-white"
        />
        <p role="status" className="w-full text-center text-sm font-bold">
          {checking ? t('scan.checking') : t('scan.aim')}
        </p>
      </div>
      {cameraError && (
        <div className="absolute inset-x-5 top-8 flex flex-col gap-3 rounded-xl bg-black/80 p-4 text-center">
          <p role="alert" className="text-sm">
            {cameraError}
          </p>
          <Button onClick={retryCamera}>{t('scan.retryCamera')}</Button>
        </div>
      )}
      <Link
        to="/waiting"
        className="primary-button absolute right-5 bottom-5 left-5 !w-auto bg-[#bcbcbc] !text-[#2a2a2a]"
        style={{ bottom: 'max(20px, env(safe-area-inset-bottom))' }}
      >
        {t('scan.back')}
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
          {t('scan.checkTitle')}
        </h2>
        <p className="my-3 text-center text-sm">{scanError}</p>
        <Button onClick={scanAgain}>{t('scan.scanAgain')}</Button>
      </dialog>
    </Page>
  )
}
