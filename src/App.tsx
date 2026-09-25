import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { DemoProvider } from './app/DemoProvider'

export default function App() {
  return (
    <DemoProvider>
      <RouterProvider router={router} />
    </DemoProvider>
  )
}
