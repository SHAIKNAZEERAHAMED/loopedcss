import { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { FirebaseProvider } from "@/contexts/firebase-context"
import { AuthProvider } from "@/contexts/auth-context"
import AppShell from "@/components/layout/app-shell"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

export const metadata: Metadata = {
  title: "Loop(CSS) - A social platform for sharing and discovering CSS designs",
  description: "Share and discover beautiful CSS designs with the community",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <FirebaseProvider>
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <AppShell>
                {children}
              </AppShell>
              <Toaster />
            </ThemeProvider>
          </AuthProvider>
        </FirebaseProvider>
      </body>
    </html>
  )
}



import './globals.css'