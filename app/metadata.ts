import type { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    default: "Loop(CSS) - Share & Discover Beautiful CSS Designs",
    template: "%s | Loop(CSS)"
  },
  description: "Join Loop(CSS), the social platform for developers to share, discover, and get inspired by beautiful CSS designs. Connect with fellow developers and showcase your web creativity.",
  keywords: ["CSS", "web design", "developers", "social platform", "design inspiration", "code sharing", "web development community"],
  authors: [{ name: "Loop(CSS) Team" }],
  creator: "Loop(CSS) Team",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" }
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://loopcss.com",
    title: "Loop(CSS) - Share & Discover Beautiful CSS Designs",
    description: "Join Loop(CSS), the social platform for developers to share, discover, and get inspired by beautiful CSS designs.",
    siteName: "Loop(CSS)"
  },
  twitter: {
    card: "summary_large_image",
    title: "Loop(CSS) - Share & Discover Beautiful CSS Designs",
    description: "Join Loop(CSS), the social platform for developers to share, discover, and get inspired by beautiful CSS designs.",
    creator: "@loopcss"
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1
  }
} 