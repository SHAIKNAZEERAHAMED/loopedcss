"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/ui/icons"
import { ModeToggle } from "@/components/mode-toggle"
import { cn } from "@/lib/utils"

const navigation = [
  {
    href: "/",
    icon: Icons.home,
    label: "Home"
  },
  {
    href: "/loops",
    icon: Icons.loop,
    label: "Loops"
  },
  {
    href: "/search",
    icon: Icons.search,
    label: "Search"
  },
  {
    href: "/messages",
    icon: Icons.message,
    label: "Messages"
  },
  {
    href: "/notifications",
    icon: Icons.bell,
    label: "Notifications"
  }
]

interface ShellProps {
  children: React.ReactNode
}

export function Shell({ children }: ShellProps) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-16 lg:w-64 border-r">
        <div className="flex h-full flex-col px-3 py-4">
          {/* Logo */}
          <Link href="/" className="mb-8 flex items-center px-2">
            <Icons.logo className="h-6 w-6" />
            <span className="hidden lg:ml-3 lg:text-xl lg:font-bold">Loops</span>
          </Link>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.href}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start",
                    pathname === item.href && "bg-muted"
                  )}
                  asChild
                >
                  <Link href={item.href}>
                    <Icon className="h-5 w-5" />
                    <span className="hidden lg:ml-3 lg:block">{item.label}</span>
                  </Link>
                </Button>
              )
            })}
          </nav>

          {/* Theme Toggle */}
          <div className="mt-auto">
            <ModeToggle />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pl-16 lg:pl-64">
        {children}
      </main>
    </div>
  )
} 