"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { LogoAnimation } from "@/components/ui/logo-animation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Home, Users, MessageSquare, Bell, Search, Settings, LogOut, Menu, X } from "lucide-react"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { SearchDialog } from "@/components/search/search-dialog"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)

  const navItems = [
    { name: "Home", href: "/dashboard", icon: Home, color: "text-share" },
    { name: "Loops", href: "/loops", icon: Users, color: "text-connect" },
    { name: "Search", href: "/search", icon: Search, color: "text-primary" },
    { name: "Messages", href: "/chat", icon: MessageSquare, color: "text-share" },
    { name: "Notifications", href: "/notifications", icon: Bell, color: "text-safe" },
    { name: "Settings", href: "/settings", icon: Settings, color: "text-muted-foreground" },
  ]

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const userInitials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U"

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background z-20 sticky top-0">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LogoAnimation />
            <h1 className="text-xl font-bold hidden sm:block">Loop(CSS)</h1>
          </div>

          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSearchDialogOpen(true)} className="mr-2">
              <Search className="h-5 w-5" />
            </Button>
            <Link href={`/profile/${user?.uid}`}>
              <Avatar className="cursor-pointer">
                <AvatarImage src={user?.photoURL || ""} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
            </Link>
            <span className="font-medium">{user?.displayName}</span>
            <Button variant="ghost" size="icon" onClick={() => logout()}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <nav className="hidden md:flex flex-col w-16 border-r bg-background">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`p-3 flex flex-col items-center justify-center gap-1 transition-colors ${
                pathname === item.href ? "bg-muted" : "hover:bg-muted/50"
              }`}
            >
              <item.icon className={`h-6 w-6 ${item.color}`} />
              <span className="text-xs">{item.name}</span>
            </Link>
          ))}
          <div className="p-3 flex flex-col items-center justify-center gap-1 transition-colors hover:bg-muted/50">
            <ThemeToggle />
            <span className="text-xs">Theme</span>
          </div>
          <button
            onClick={() => logout()}
            className="mt-auto p-3 flex flex-col items-center justify-center gap-1 transition-colors hover:bg-muted/50"
          >
            <LogOut className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs">Logout</span>
          </button>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-background z-30 md:hidden">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <LogoAnimation />
                  <h1 className="text-xl font-bold">Loop(CSS)</h1>
                </div>
                <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
                  <X />
                </Button>
              </div>

              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-4 p-4 border rounded-lg mb-4">
                  <Link href={`/profile/${user?.uid}`} onClick={toggleMobileMenu}>
                    <Avatar className="cursor-pointer">
                      <AvatarImage src={user?.photoURL || ""} />
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div>
                    <p className="font-medium">{user?.displayName}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`p-3 flex items-center gap-3 rounded-lg transition-colors ${
                      pathname === item.href ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                    onClick={toggleMobileMenu}
                  >
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                    <span>{item.name}</span>
                  </Link>
                ))}

                <div className="p-3 flex items-center gap-3 rounded-lg transition-colors hover:bg-muted/50">
                  <ThemeToggle />
                  <span>Theme</span>
                </div>
                <button
                  onClick={() => {
                    logout()
                    toggleMobileMenu()
                  }}
                  className="mt-4 p-3 flex items-center gap-3 rounded-lg transition-colors hover:bg-muted/50"
                >
                  <LogOut className="h-5 w-5 text-muted-foreground" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-auto">{children}</div>

        {/* Search Dialog */}
        <SearchDialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen} />
      </div>
    </div>
  )
}

