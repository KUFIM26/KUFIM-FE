import { RouterProvider } from 'react-router-dom'
import { router } from './router/router'
import { isMockMode } from './apis/mode'
import { AuthProvider } from './app/AuthProvider'
export default function App() {
  return (
    <AuthProvider>
      {isMockMode && (
        <div className="bg-amber-100 px-3 py-2 text-center text-xs text-amber-950">
          목업 모드 · 변경 내용은 이 브라우저에만 저장됩니다.
        </div>
      )}
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
