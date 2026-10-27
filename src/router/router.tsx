import { AdminGuard, LoginPage } from '../pages/AuthPages'
import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from '../components/layout'
import HomePage from '../pages/HomePage'
import AdminCongestionPage from '../pages/AdminCongestionPage'
import MenuPage from '../pages/MenuPage'
import MapPage from '../pages/MapPage'
import { BoothsPage, BoothDetailPage } from '../pages/BoothsPage'
import { PerformancesPage, PerformanceDetailPage } from '../pages/PerformancesPage'
import { NoticesPage, NoticeDetailPage, NotificationsPage } from '../pages/NoticesPage'
import { WaitingPage, ScanPage, WaitingRegisterPage, QrEntryPage } from '../pages/WaitingPages'
import { NoticeFormPage, PerformanceFormPage, BoothFormPage } from '../pages/AdminForms'
import { AdminWaitingListPage, AdminQueuePage, AdminSettingsPage } from '../pages/AdminWaitingPages'
import { ErrorPage, GuidePage, LoadingPage, NotFoundPage, PreviewPage } from '../pages/UtilityPages'

// Browser history routes. Configure your static host to fall back to index.html.
// Admin routes require the server session and role.
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage />, handle: { bottomNav: true } },
      { path: 'menu', element: <MenuPage />, handle: { bottomNav: true } },
      { path: 'map', element: <MapPage />, handle: { bottomNav: true } },
      { path: 'booths', element: <BoothsPage /> },
      { path: 'booths/:id', element: <BoothDetailPage /> },
      { path: 'performances', element: <PerformancesPage /> },
      { path: 'performances/:id', element: <PerformanceDetailPage /> },
      { path: 'notices', element: <NoticesPage /> },
      { path: 'notices/:id', element: <NoticeDetailPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'waiting', element: <WaitingPage />, handle: { bottomNav: true } },
      { path: 'w/:boothCode', element: <QrEntryPage /> },
      { path: 'waiting/scan', element: <ScanPage /> },
      { path: 'waiting/register/:boothId', element: <WaitingRegisterPage /> },
      { path: 'admin/login', element: <LoginPage /> },
      {
        path: 'admin',
        element: <AdminGuard />,
        children: [
          { index: true, element: <MenuPage admin />, handle: { bottomNav: true } },
          { path: 'notices', element: <NoticesPage admin /> },
          { path: 'notices/new', element: <NoticeFormPage key="new" /> },
          { path: 'notices/:id/edit', element: <NoticeFormPage /> },
          { path: 'performances', element: <PerformancesPage admin /> },
          { path: 'performances/new', element: <PerformanceFormPage key="new" /> },
          { path: 'performances/:id/edit', element: <PerformanceFormPage /> },
          { path: 'booths', element: <BoothsPage admin /> },
          { path: 'booths/new', element: <BoothFormPage key="new" /> },
          { path: 'booths/:id/edit', element: <BoothFormPage /> },
          { path: 'waiting', element: <AdminWaitingListPage /> },
          { path: 'congestion', element: <AdminCongestionPage /> },
          { path: 'waiting/:boothId', element: <AdminQueuePage /> },
          { path: 'waiting/:boothId/settings', element: <AdminSettingsPage /> },
        ],
      },
      { path: 'report', element: <GuidePage report /> },
      { path: 'guide', element: <GuidePage /> },
      { path: 'preview', element: <PreviewPage /> },
      { path: 'loading', element: <LoadingPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
