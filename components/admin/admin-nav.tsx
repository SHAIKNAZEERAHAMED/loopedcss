"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Shield, Video, Mic, MessageSquare, User, BarChart4, Settings } from "lucide-react"

export function AdminNav() {
  const pathname = usePathname()

  const navItems = [
    {
      title: "Safety Dashboard",
      href: "/admin/safety-dashboard",
      icon: Shield,
    },
    {
      title: "Loop Moderation",
      href: "/admin/loop-moderation",
      icon: Video,
    },
    {
      title: "Audio Moderation",
      href: "/admin/audio-moderation",
      icon: Mic,
    },
    {
      title: "DM Safety",
      href: "/admin/dm-safety",
      icon: MessageSquare,
    },
    {
      title: "User Management",
      href: "/admin/users",
      icon: User,
    },
    {
      title: "Analytics",
      href: "/admin/analytics",
      icon: BarChart4,
    },
    {
      title: "Settings",
      href: "/admin/settings",
      icon: Settings,
    },
  ]

  return (
    <nav className="flex flex-col gap-2 p-4 border-r h-full">
      {navItems.map((item) => (
        <Button
          key={item.href}
          variant="ghost"
          className={cn("justify-start gap-2", pathname === item.href && "bg-muted")}
          asChild
        >
          <Link href={item.href}>
            <item.icon className="h-4 w-4" />
            {item.title}
          </Link>
        </Button>
      ))}
    </nav>
  )
}

