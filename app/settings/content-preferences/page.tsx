import { ContentPreferences } from "@/components/settings/content-preferences"

export default function ContentPreferencesPage() {
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-6">Content Preferences</h1>
      <ContentPreferences />
    </div>
  )
}

