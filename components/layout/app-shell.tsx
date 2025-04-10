"use client"

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { MainNav } from '@/components/layout/main-nav'
import { UserNav } from '@/components/layout/user-nav'
import { SiteHeader } from '@/components/layout/site-header'

const publicPaths = ['/login', '/sign-up', '/register']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const isPublicPath = publicPaths.includes(pathname || '')

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
      </div>
    )
  }

  // Don't show header on public pages
  if (isPublicPath) {
    return <>{children}</>
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteHeader>
        <MainNav />
        {user && <UserNav />}
      </SiteHeader>
      <main className="flex-1">{children}</main>
    </div>
  )
} 