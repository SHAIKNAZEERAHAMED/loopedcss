"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Icons } from "@/components/ui/icons"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function NavigationSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  const links = [
    {
      href: "/",
      icon: Icons.home,
      label: "Home",
    },
    {
      href: "/loops",
      icon: Icons.users,
      label: "Loops",
    },
    {
      href: "/search",
      icon: Icons.search,
      label: "Search",
    },
    {
      href: "/messages",
      icon: Icons.messageCircle,
      label: "Messages",
    },
    {
      href: "/notifications",
      icon: Icons.bell,
      label: "Notifications",
    },
    {
      href: "/settings",
      icon: Icons.settings,
      label: "Settings",
    },
  ]

  return (
    <div className="flex h-full w-[250px] flex-col border-r px-3 py-4">
      <div className="flex items-center gap-2 px-2">
        <Icons.bot className="h-8 w-8" />
        <span className="text-xl font-semibold">Loop(CSS)</span>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </Link>
          )
        })}
      </nav>

      {user && (
        <div className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.photoURL || undefined} />
            <AvatarFallback>
              {user.displayName?.[0] || user.email?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col">
            <span className="text-sm font-medium">
              {user.displayName || "User"}
            </span>
            <span className="text-xs text-muted-foreground">
              {user.email}
            </span>
          </div>
        </div>
      )}
    </div>
  )
} 