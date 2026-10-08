import { RouterProvider } from 'react-router-dom'
import { router } from './router/router'
import { DemoProvider } from './app/DemoProvider'
import { AdminSessionProvider } from './app/AdminSessionProvider'

export default function App() {
  return (
    <DemoProvider>
      <AdminSessionProvider>
        <RouterProvider router={router} />
      </AdminSessionProvider>
    </DemoProvider>
  )
}
