import { useLayoutEffect, useRef, useState } from 'react'
import type { Ref } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Glass } from '@samasante/liquid-glass'
import { motion, useReducedMotion, useSpring } from 'motion/react'
import { figmaAssets as assets } from '../data/figma-assets'
import { useAuth } from '../app/auth-context'
import { useAction } from '../hooks/useResource'
import { RequestState } from './RequestState'

const spring = { stiffness: 420, damping: 36, mass: 1 }

export function BottomNav({
  visible,
  actionRef,
}: {
  visible: boolean
  actionRef: Ref<HTMLDivElement>
}) {
  const { account, checkSession } = useAuth()
  const navigate = useNavigate()
  const { pathname, key: locationKey } = useLocation()
  const menuAction = useAction()
  const [menuRequestLocation, setMenuRequestLocation] = useState(locationKey)
  const navRef = useRef<HTMLElement>(null)
  const wasVisible = useRef(false)
  const reduceMotion = useReducedMotion()
  const x = useSpring(0, spring)
  const width = useSpring(0, spring)
  const openMenu = () => {
    setMenuRequestLocation(locationKey)
    return menuAction.run(async () => {
      await checkSession((session) => navigate(session ? '/admin' : '/menu'))
    })
  }

  // Keep the same lens mounted between routes so an interrupted spring retains its velocity.
  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav || !visible) {
      wasVisible.current = false
      return
    }
    const measure = (instant: boolean) => {
      const active = nav.querySelector<HTMLElement>('[aria-current="page"]')
      if (!active) return
      const left = active.offsetLeft - 2
      const size = active.offsetWidth + 4
      if (instant || reduceMotion) {
        x.jump(left)
        width.jump(size)
      } else {
        x.set(left)
        width.set(size)
      }
    }
    measure(!wasVisible.current)
    wasVisible.current = true
    // Observe the bar's width only; its initial notification must not cancel a route animation.
    let previousWidth = nav.clientWidth
    const resizeObserver = new ResizeObserver(() => {
      if (nav.clientWidth !== previousWidth) {
        previousWidth = nav.clientWidth
        measure(false)
      }
    })
    resizeObserver.observe(nav)
    return () => resizeObserver.disconnect()
  }, [pathname, visible, reduceMotion, account, x, width])

  const links = [
    { to: '/', label: '홈', icon: assets['221:412'].home, iconWidth: 22 },
    { to: '/map', label: '지도', icon: assets['221:412'].map, iconWidth: 24 },
    { to: '/waiting', label: '웨이팅', icon: assets['221:412'].waiting, iconWidth: 24.205 },
    {
      to: account ? '/admin' : '/menu',
      label: '전체보기',
      accessibleLabel: '전체 보기',
      menu: true,
      icon: assets['221:412'].menu,
      iconWidth: 18.1645,
    },
  ]
  return (
    <div className="bottom-nav-container" hidden={!visible}>
      <div ref={actionRef} className="bottom-nav-action pointer-events-auto empty:hidden" />
      {menuAction.error && menuRequestLocation === locationKey && (
        <div className="pointer-events-auto rounded-xl bg-white shadow-card">
          <RequestState error={menuAction.error} retry={() => void openMenu()} />
        </div>
      )}
      <nav ref={navRef} aria-label="주 메뉴" className="bottom-nav">
        <Glass
          className="bottom-nav-material"
          aria-hidden="true"
          radius={31}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
        <motion.div className="bottom-nav-selection" aria-hidden="true" style={{ x, width }}>
          <Glass
            className="bottom-nav-lens"
            radius={27}
            style={{ width: '100%', height: '100%' }}
          />
        </motion.div>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            aria-label={link.accessibleLabel}
            aria-disabled={link.menu && menuAction.pending ? true : undefined}
            aria-busy={link.menu && menuAction.pending ? true : undefined}
            onClick={
              link.menu
                ? (event) => {
                    event.preventDefault()
                    void openMenu()
                  }
                : undefined
            }
            className="bottom-nav-tab"
          >
            <span
              aria-hidden="true"
              className="bottom-nav-icon"
              style={{
                width: link.iconWidth,
                maskImage: `url(${link.icon})`,
                WebkitMaskImage: `url(${link.icon})`,
              }}
            />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
