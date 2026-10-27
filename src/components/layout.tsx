import { FestivalProvider } from '../app/FestivalProvider'
import { FestivalContext } from '../app/festival-context'
import { useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, Outlet, useLocation, useMatches, useNavigate } from 'react-router-dom'
import { Asset } from './ui'
import { figmaAssets as assets } from '../data/figma-assets'
import { BottomNav } from './BottomNav'
import { BottomNavActionContext } from './bottom-nav-context'
import { createPortal } from 'react-dom'

export function RootLayout() {
  const { pathname } = useLocation()
  const [actionHost, setActionHost] = useState<HTMLDivElement | null>(null)
  const nav = useMatches().some((match) => (match.handle as { bottomNav?: boolean })?.bottomNav)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <div className="app-shell">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3"
      >
        본문으로 건너뛰기
      </a>
      <BottomNavActionContext.Provider value={actionHost}>
        <FestivalProvider key={pathname.startsWith('/admin') ? 'admin' : 'public'}>
          <Outlet />
        </FestivalProvider>
        <BottomNav visible={nav} actionRef={setActionHost} />
      </BottomNavActionContext.Provider>
    </div>
  )
}
export function Header({
  title,
  back,
  plain = false,
  home = false,
  action,
  backIcon,
}: {
  title: string
  back?: string
  plain?: boolean
  home?: boolean
  action?: ReactNode
  backIcon?: string
}) {
  const navigate = useNavigate()
  const festival = useContext(FestivalContext)?.festival
  useEffect(() => {
    document.title = `${title} · KUFIM`
  }, [title])
  const goBack = () => {
    if (back !== undefined) navigate(back)
    else navigate(-1)
  }
  if (home)
    return (
      <header className="flex h-[75px] items-center justify-between px-5">
        <div>
          <p className="text-xs font-bold">KUFIM</p>
          <h1 className="mt-0.5 text-lg font-bold max-[360px]:text-base">
            {festival?.name || 'KUFIM 축제 안내'}
          </h1>
        </div>
        <Link
          to="/notifications"
          aria-label="알림함"
          className="ml-2 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f3f3f3]"
        >
          <Asset src={assets['17:303'].imgAkarIconsBell} />
        </Link>
      </header>
    )
  return (
    <header className={`flex h-[68px] items-center gap-4 bg-white px-5 ${plain ? 'pl-7' : ''}`}>
      {!plain && (
        <button
          type="button"
          aria-label="뒤로 가기"
          onClick={goBack}
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f3f3f3]"
        >
          <Asset src={backIcon ?? assets['31:385'].imgVector} className="rotate-180" />
        </button>
      )}
      <h1 className="min-w-0 flex-1 text-lg font-bold">{title}</h1>
      {action}
    </header>
  )
}
export function Page({
  title,
  back,
  plain,
  nav = false,
  navAction,
  home,
  action,
  children,
  className = '',
  backIcon,
}: {
  title: string
  back?: string
  plain?: boolean
  nav?: boolean
  navAction?: ReactNode
  home?: boolean
  action?: ReactNode
  children: ReactNode
  className?: string
  backIcon?: string
}) {
  const actionHost = useContext(BottomNavActionContext)
  return (
    <>
      {nav && navAction && actionHost && createPortal(navAction, actionHost)}
      <Header
        title={title}
        back={back}
        plain={plain}
        home={home}
        action={action}
        backIcon={backIcon}
      />
      <main
        id="main-content"
        className={`page-surface ${nav ? 'page-with-nav' : ''} ${className}`}
        style={
          home
            ? {
                minHeight: 'calc(100dvh - 75px)',
                backgroundImage: `url(${assets['17:303'].imgRectangle15}), linear-gradient(white, white)`,
                backgroundSize: 'auto, 100% 1626px',
              }
            : undefined
        }
      >
        {children}
      </main>
    </>
  )
}
export function BottomActions({ children }: { children: ReactNode }) {
  return <div className="bottom-actions">{children}</div>
}
