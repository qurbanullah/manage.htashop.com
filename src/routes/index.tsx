import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RootLayout } from '@/components/layouts/RootLayout'
import { PageSpinner } from '@/components/shared/PageSpinner'
import { AuthRoutes } from '@/routes/auth.routes'
import { paths } from '@/routes/paths'
import { PrivateRoutes } from '@/routes/private.routes'
import { PublicRoutes } from '@/routes/public.routes'

export function AppRouter() {
  return (
    <RootLayout>
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path={paths.root} element={<Navigate to={paths.login} replace />} />
          {AuthRoutes()}
          {PrivateRoutes()}
          {PublicRoutes()}
        </Routes>
      </Suspense>
    </RootLayout>
  )
}
