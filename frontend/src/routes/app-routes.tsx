import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { LoginPage } from '@/pages/login-page'
import { RegisterPage } from '@/pages/register-page'
import { ProfilePage } from '@/pages/profile-page'
import { TasksPage } from '@/pages/tasks-page'
import { TaskDetailPage } from '@/pages/task-detail-page'
import { ProtectedRoute } from '@/routes/protected-route'
import { PublicOnlyRoute } from '@/routes/public-only-route'

const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/profile', element: <ProfilePage /> },
      { path: '/tasks', element: <TasksPage /> },
      { path: '/tasks/:id', element: <TaskDetailPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/profile" replace /> },
])

export function AppRoutes() {
  return <RouterProvider router={router} />
}
