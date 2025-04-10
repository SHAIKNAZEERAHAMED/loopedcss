import { Metadata } from "next"
import ClientLayout from "@/app/client-layout"

export const metadata: Metadata = {
  title: "BOB AI Assistant - Loop",
  description: "Chat with BOB AI - Your bilingual assistant that understands Telugu and English",
}

interface BobAssistantLayoutProps {
  children: React.ReactNode
}

export default function BobAssistantLayout({ children }: BobAssistantLayoutProps) {
  return <ClientLayout>{children}</ClientLayout>
} 