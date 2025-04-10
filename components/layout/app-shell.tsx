"use client"

import { ReactNode, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/ui/icons"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { auth } from "@/lib/firebase/config"
import { User } from "firebase/auth"

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Only run on client side
  useEffect(() => {
    setIsClient(true)
    
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Set up auth state listener
      const unsubscribe = auth?.onAuthStateChanged((user) => {
        setUser(user)
        setLoading(false)
      })

      // Clean up subscription
      return () => unsubscribe?.()
    } else {
      // If we're on the server, just set loading to false
      setLoading(false)
    }
  }, [])

  // If we're on the server or still loading, render a simplified version
  if (!isClient || loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <div className="mr-4 hidden md:flex">
              <Link href="/" className="mr-6 flex items-center space-x-2">
                <Icons.bot className="h-6 w-6" />
                <span className="hidden font-bold sm:inline-block">
                  Loop(CSS)
                </span>
              </Link>
            </div>
            <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
              <div className="w-full flex-1 md:w-auto md:flex-none">
                <Button
                  variant="ghost"
                  className="w-9 px-0 md:hidden"
                  asChild
                >
                  <Link href="/">
                    <Icons.bot className="h-6 w-6" />
                  </Link>
                </Button>
              </div>
              <nav className="flex items-center">
                <ThemeToggle />
              </nav>
            </div>
          </div>
        </header>
        <main>
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <Icons.bot className="h-6 w-6" />
              <span className="hidden font-bold sm:inline-block">
                Loop(CSS)
              </span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Button
                variant={pathname === "/" ? "secondary" : "ghost"}
                className="w-9"
                asChild
              >
                <Link href="/">
                  <Icons.home className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant={pathname === "/search" ? "secondary" : "ghost"}
                className="w-9"
                asChild
              >
                <Link href="/search">
                  <Icons.search className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant={pathname === "/notifications" ? "secondary" : "ghost"}
                className="w-9"
                asChild
              >
                <Link href="/notifications">
                  <Icons.bell className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant={pathname === "/messages" ? "secondary" : "ghost"}
                className="w-9"
                asChild
              >
                <Link href="/messages">
                  <Icons.messageCircle className="h-4 w-4" />
                </Link>
              </Button>
            </nav>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              <Button
                variant="ghost"
                className="w-9 px-0 md:hidden"
                asChild
              >
                <Link href="/">
                  <Icons.bot className="h-6 w-6" />
                </Link>
              </Button>
            </div>
            <nav className="flex items-center">
              <ThemeToggle />
              {user && (
                <Button variant="ghost" size="icon" className="ml-2" asChild>
                  <Link href={`/profile/${user.uid}`}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL || ""} />
                      <AvatarFallback>
                        {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                </Button>
              )}
            </nav>
          </div>
        </div>
      </header>
      <main>
        {children}
      </main>
    </div>
  )
} 