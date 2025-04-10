import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Home | Loop(CSS)",
  description: "Your personalized feed",
}

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 