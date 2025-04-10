"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, Bell, User, Settings, Shield, Bookmark, BarChart, Brain, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()

  const routes = [
    {
      label: "Home",
      icon: Home,
      href: "/",
      active: pathname === "/",
    },
    {
      label: "Explore",
      icon: Search,
      href: "/explore",
      active: pathname === "/explore",
    },
    {
      label: "Notifications",
      icon: Bell,
      href: "/notifications",
      active: pathname === "/notifications",
    },
    {
      label: "Profile",
      icon: User,
      href: "/profile",
      active: pathname === "/profile",
    },
    {
      label: "Saved",
      icon: Bookmark,
      href: "/saved",
      active: pathname === "/saved",
    },
    {
      label: "Settings",
      icon: Settings,
      href: "/settings",
      active: pathname === "/settings",
    },
    {
      label: "Safety",
      icon: Shield,
      href: "/safety",
      active: pathname === "/safety",
    },
  ]

  const adminRoutes = [
    {
      label: "ML Dashboard",
      icon: BarChart,
      href: "/admin/ml-dashboard",
      active: pathname === "/admin/ml-dashboard",
    },
    {
      label: "Explainable AI",
      icon: Brain,
      href: "/admin/explainable-ai",
      active: pathname === "/admin/explainable-ai",
    },
    {
      label: "Content Moderation",
      icon: Shield,
      href: "/admin/moderation",
      active: pathname === "/admin/moderation",
    },
    {
      label: "Paid Content Security",
      icon: Lock,
      href: "/admin/paid-security",
      active: pathname === "/admin/paid-security",
    },
  ]

  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold">Navigation</h2>
          <div className="space-y-1">
            {routes.map((route) => (
              <Button
                key={route.href}
                variant={route.active ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  route.active ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
                asChild
              >
                <Link href={route.href}>
                  <route.icon className="mr-2 h-4 w-4" />
                  {route.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>

        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold">Admin</h2>
          <div className="space-y-1">
            {adminRoutes.map((route) => (
              <Button
                key={route.href}
                variant={route.active ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  route.active ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
                asChild
              >
                <Link href={route.href}>
                  <route.icon className="mr-2 h-4 w-4" />
                  {route.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

