'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icons } from '@/components/icons'
import { Button } from '@/components/ui/button'

export function MainNav() {
  const pathname = usePathname()

  return (
    <div className="mr-4 hidden md:flex">
      <Link href="/" className="mr-6 flex items-center space-x-2">
        <Icons.logo className="h-6 w-6" />
        <span className="hidden font-bold sm:inline-block">
          Loop(CSS)
        </span>
      </Link>
      <nav className="flex items-center space-x-6 text-sm font-medium">
        <Button
          variant={pathname === '/feed' ? 'secondary' : 'ghost'}
          className="w-9"
          asChild
        >
          <Link href="/feed">
            <Icons.home className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          variant={pathname === '/explore' ? 'secondary' : 'ghost'}
          className="w-9"
          asChild
        >
          <Link href="/explore">
            <Icons.compass className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          variant={pathname === '/notifications' ? 'secondary' : 'ghost'}
          className="w-9"
          asChild
        >
          <Link href="/notifications">
            <Icons.bell className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          variant={pathname === '/messages' ? 'secondary' : 'ghost'}
          className="w-9"
          asChild
        >
          <Link href="/messages">
            <Icons.messageCircle className="h-4 w-4" />
          </Link>
        </Button>
      </nav>
    </div>
  )
} 