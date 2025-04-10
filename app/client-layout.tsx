"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Icons } from "@/components/ui/icons"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

const publicRoutes = ["/login", "/register", "/sign-in", "/sign-up"]

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading) {
      if (!user && !publicRoutes.includes(pathname)) {
        router.push("/login")
      } else if (user && publicRoutes.includes(pathname)) {
        router.push("/")
      }
    }
  }, [user, loading, pathname, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (publicRoutes.includes(pathname)) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="flex items-center gap-6 flex-1">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <Icons.logo className="h-8 w-8 text-primary" />
              <div>
                <span className="font-bold text-xl">Loop(CSS)</span>
                <Badge variant="outline" className="ml-2 font-normal">
                  Connect • Share • Secure
                </Badge>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 ml-6">
              <Button variant={pathname === "/" ? "secondary" : "ghost"} asChild className="w-full justify-start">
                <Link href="/">
                  <Icons.home className="h-5 w-5 mr-2" />
                  Home
                </Link>
              </Button>
              <Button variant={pathname === "/loops" ? "secondary" : "ghost"} asChild className="w-full justify-start">
                <Link href="/loops">
                  <Icons.share className="h-5 w-5 mr-2" />
                  Loops
                </Link>
              </Button>
              <Button variant={pathname === "/search" ? "secondary" : "ghost"} asChild className="w-full justify-start">
                <Link href="/search">
                  <Icons.search className="h-5 w-5 mr-2" />
                  Search
                </Link>
              </Button>
              <Button variant={pathname === "/messages" ? "secondary" : "ghost"} asChild className="w-full justify-start">
                <Link href="/messages">
                  <Icons.message className="h-5 w-5 mr-2" />
                  Messages
                </Link>
              </Button>
              <Button variant={pathname === "/notifications" ? "secondary" : "ghost"} asChild className="w-full justify-start">
                <Link href="/notifications">
                  <Icons.bell className="h-5 w-5 mr-2" />
                  Notifications
                </Link>
              </Button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-10 w-10">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.photoURL || undefined} />
                      <AvatarFallback>
                        {user.displayName?.[0] || user.email?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/profile/${user.uid}`} className="cursor-pointer">
                      <Icons.user className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                      <Icons.settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/subscription" className="cursor-pointer">
                      <Icons.sparkles className="mr-2 h-4 w-4" />
                      Premium Features
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/bob-assistant" className="cursor-pointer">
                      <Icons.bot className="mr-2 h-4 w-4" />
                      BOB AI Assistant
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/festival" className="cursor-pointer">
                      <Icons.pizza className="mr-2 h-4 w-4" />
                      Festival Mode
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <main className="container py-6">
        {children}
      </main>
    </div>
  )
} 