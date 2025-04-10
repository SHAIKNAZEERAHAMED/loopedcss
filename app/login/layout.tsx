import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Login - Loop(CSS)",
  description: "Sign in to your Loop(CSS) account",
}

interface LoginLayoutProps {
  children: React.ReactNode
}

export default function LoginLayout({ children }: LoginLayoutProps) {
  return children
} 