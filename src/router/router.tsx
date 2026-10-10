import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from '../components/layout'
import HomePage from '../pages/HomePage'
import MenuPage from '../pages/MenuPage'
import MapPage from '../pages/MapPage'
import { BoothsPage, BoothDetailPage } from '../pages/BoothsPage'
import { PerformancesPage, PerformanceDetailPage } from '../pages/PerformancesPage'
import { NoticesPage, NoticeDetailPage, NotificationsPage } from '../pages/NoticesPage'
import { WaitingPage, ScanPage, WaitingRegisterPage, QrEntryPage } from '../pages/WaitingPages'
import { NoticeFormPage, PerformanceFormPage, BoothFormPage } from '../pages/AdminForms'
import { AdminWaitingListPage, AdminQueuePage, AdminSettingsPage } from '../pages/AdminWaitingPages'
import AdminLoginPage from '../pages/AdminLoginPage'
import AdminCongestionPage from '../pages/AdminCongestionPage'
import { AdminGate } from '../app/AdminSessionProvider'
import { ErrorPage, GuidePage, LoadingPage, NotFoundPage, PreviewPage } from '../pages/UtilityPages'

// Browser history routes. Configure your static host to fall back to index.html.
// Admin routes require a backend session in API mode and stay open in the mock demo.
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'menu', element: <MenuPage /> },
      { path: 'map', element: <MapPage /> },
      { path: 'booths', element: <BoothsPage /> },
      { path: 'booths/:id', element: <BoothDetailPage /> },
      { path: 'performances', element: <PerformancesPage /> },
      { path: 'performances/:id', element: <PerformanceDetailPage /> },
      { path: 'notices', element: <NoticesPage /> },
      { path: 'notices/:id', element: <NoticeDetailPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'waiting', element: <WaitingPage /> },
      { path: 'waiting/scan', element: <ScanPage /> },
      { path: 'waiting/register/:boothId', element: <WaitingRegisterPage /> },
      // Printed booth QR codes encode FRONTEND_BASE_URL/w/{boothCode}.
      { path: 'w/:boothCode', element: <QrEntryPage /> },
      { path: 'admin/login', element: <AdminLoginPage /> },
      {
        path: 'admin',
        element: <AdminGate />,
        children: [
          { index: true, element: <MenuPage admin /> },
          { path: 'notices', element: <NoticesPage admin /> },
          { path: 'notices/new', element: <NoticeFormPage key="new" /> },
          { path: 'notices/:id/edit', element: <NoticeFormPage /> },
          { path: 'performances', element: <PerformancesPage admin /> },
          { path: 'performances/new', element: <PerformanceFormPage key="new" /> },
          { path: 'performances/:id/edit', element: <PerformanceFormPage /> },
          { path: 'booths', element: <BoothsPage admin /> },
          { path: 'booths/new', element: <BoothFormPage key="new" /> },
          { path: 'booths/:id/edit', element: <BoothFormPage /> },
          { path: 'congestion', element: <AdminCongestionPage /> },
          { path: 'waiting', element: <AdminWaitingListPage /> },
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
