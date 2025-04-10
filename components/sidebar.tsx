"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icons } from "@/components/ui/icons"

export function Sidebar() {
  const pathname = usePathname()
  const { user, userProfile, logout } = useAuth()

  const navigation = [
    {
      name: "Feed",
      href: "/feed",
      icon: Icons.home,
    },
    {
      name: "Explore",
      href: "/explore",
      icon: Icons.compass,
    },
    {
      name: "Bookmarks",
      href: "/bookmarks",
      icon: Icons.bookmark,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Icons.settings,
    },
  ]

  return (
    <div className="sticky top-4 space-y-4">
      {/* User Profile */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={userProfile?.photoURL} alt={userProfile?.displayName} />
            <AvatarFallback>{userProfile?.displayName?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{userProfile?.displayName}</p>
            <p className="text-sm text-muted-foreground">{userProfile?.email}</p>
          </div>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <div>
            <p className="font-medium">{userProfile?.followers || 0}</p>
            <p>Followers</p>
          </div>
          <div>
            <p className="font-medium">{userProfile?.following || 0}</p>
            <p>Following</p>
          </div>
          <div>
            <p className="font-medium">{userProfile?.posts || 0}</p>
            <p>Posts</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground ${
                pathname === item.href ? "bg-accent text-accent-foreground" : ""
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Actions */}
      <div className="space-y-2">
        <Button className="w-full" onClick={() => logout()}>
          <Icons.logout className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
} 