import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Asset } from './ui'
import { figmaAssets as assets } from '../data/figma-assets'

export function RootLayout() {
  const { pathname } = useLocation()
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
      <Outlet />
    </div>
  )
}
export function Header({
  title,
  back = '/',
  plain = false,
  home = false,
  action,
}: {
  title: string
  back?: string
  plain?: boolean
  home?: boolean
  action?: ReactNode
}) {
  const navigate = useNavigate()
  useEffect(() => {
    document.title = `${title} · KUFIM`
  }, [title])
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate(back)
  }
  if (home)
    return (
      <header className="flex h-[75px] items-center justify-between px-5">
        <div>
          <p className="text-xs font-bold">KUFIM</p>
          <h1 className="mt-0.5 text-lg font-bold max-[360px]:text-base">
            2026 건국대학교 가을대동제 ‘일감연'
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
          <Asset src={assets['31:385'].imgVector} className="rotate-180" />
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
  home,
  action,
  children,
  className = '',
}: {
  title: string
  back?: string
  plain?: boolean
  nav?: boolean
  home?: boolean
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <>
      <Header title={title} back={back} plain={plain} home={home} action={action} />
      <main
        id="main-content"
        className={`page-surface ${nav ? 'pb-[56px]' : ''} ${className}`}
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
      {nav && <BottomNav />}
    </>
  )
}
function BottomNav() {
  const links = [
    {
      to: '/',
      label: '홈',
      normal: assets['94:255'].imgVector1,
      active: assets['17:303'].imgVector,
    },
    {
      to: '/map',
      label: '지도',
      normal: assets['17:303'].imgGroup2,
      active: assets['53:1227'].imgGroup2,
    },
    {
      to: '/waiting',
      label: '웨이팅',
      normal: assets['17:303'].imgVector1,
      active: assets['75:2'].imgVector4,
    },
    {
      to: '/menu',
      label: '전체 보기',
      normal: assets['17:303'].imgFrame1597881159,
      active: assets['94:255'].imgFrame1597881159,
    },
  ]
  return (
    <nav
      aria-label="주 메뉴"
      className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-32px)] max-w-[361px] -translate-x-1/2 justify-between rounded-[15px] bg-white px-[23px] py-1.5 shadow-nav"
      style={{ bottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) =>
            `flex w-[44.529px] flex-col items-center text-[10.687px] font-semibold ${isActive ? 'text-brand' : 'text-black'}`
          }
        >
          {({ isActive }) => (
            <>
              <span className="flex h-[35.623px] items-center justify-center">
                <Asset src={isActive ? link.active : link.normal} />
              </span>
              <span>{link.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
export function BottomActions({ children }: { children: ReactNode }) {
  return <div className="bottom-actions">{children}</div>
}
