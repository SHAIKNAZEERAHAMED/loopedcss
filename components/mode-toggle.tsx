"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/ui/icons"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const dark = theme === "dark"
  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setTheme(dark ? "light" : "dark")}>
      {dark ? <Icons.sun className="h-4 w-4" /> : <Icons.moon className="h-4 w-4" />}
    </Button>
  )
}
