"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts"
import { getMLModelAccuracy, runModelEvaluation } from "@/lib/ml/accuracy-tracking-service"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export function ModelAccuracyDashboard() {
  const [accuracy, setAccuracy] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchAccuracy()
  }, [])

  async function fetchAccuracy() {
    try {
      setLoading(true)
      const data = await getMLModelAccuracy()
      setAccuracy(data)
    } catch (error) {
      console.error("Error fetching ML model accuracy:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    try {
      setRefreshing(true)
      // Run model evaluation to update metrics
      runModelEvaluation()
      // Fetch updated metrics
      await fetchAccuracy()
    } catch (error) {
      console.error("Error refreshing metrics:", error)
    } finally {
      setRefreshing(false)
    }
  }

  if (loading || !accuracy) {
    return <p>Loading accuracy data...</p>
  }

  // Prepare data for charts
  const languageData = Object.entries(accuracy.contentModeration.byLanguage).map(([language, value]) => ({
    language: language.charAt(0).toUpperCase() + language.slice(1),
    accuracy: value,
  }))

  const contentTypeData = Object.entries(accuracy.contentModeration.byContentType).map(([type, value]) => ({
    type: type.charAt(0).toUpperCase() + type.slice(1),
    accuracy: value,
  }))

  const categoryData = Object.entries(accuracy.contentModeration.byCategory).map(([category, value]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    accuracy: value,
  }))

  const sentimentData = Object.entries(accuracy.sentiment)
    .map(([sentiment, value]) => ({
      name: sentiment.charAt(0).toUpperCase() + sentiment.slice(1),
      value: sentiment === "overall" ? 0 : value,
    }))
    .filter((item) => item.name !== "Overall")

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]

  // Radar chart data
  const radarData = [
    { subject: "Text", A: accuracy.contentModeration.byContentType.text, fullMark: 100 },
    { subject: "Image", A: accuracy.contentModeration.byContentType.image, fullMark: 100 },
    { subject: "Video", A: accuracy.contentModeration.byContentType.video, fullMark: 100 },
    { subject: "Audio", A: accuracy.contentModeration.byContentType.audio, fullMark: 100 },
    { subject: "Sentiment", A: accuracy.sentiment.overall, fullMark: 100 },
    { subject: "Recommendation", A: accuracy.recommendation.overall, fullMark: 100 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh Metrics"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accuracy.contentModeration.overall.toFixed(1)}%</div>
            <div className="w-full bg-muted rounded-full h-2.5 mt-2">
              <div
                className="bg-primary h-2.5 rounded-full"
                style={{ width: `${accuracy.contentModeration.overall}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Telugu Support</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accuracy.contentModeration.byLanguage.telugu.toFixed(1)}%</div>
            <div className="w-full bg-muted rounded-full h-2.5 mt-2">
              <div
                className="bg-primary h-2.5 rounded-full"
                style={{ width: `${accuracy.contentModeration.byLanguage.telugu}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hate Speech Detection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accuracy.hateSpeech.overall.toFixed(1)}%</div>
            <div className="w-full bg-muted rounded-full h-2.5 mt-2">
              <div className="bg-primary h-2.5 rounded-full" style={{ width: `${accuracy.hateSpeech.overall}%` }}></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sentiment Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accuracy.sentiment.overall.toFixed(1)}%</div>
            <div className="w-full bg-muted rounded-full h-2.5 mt-2">
              <div className="bg-primary h-2.5 rounded-full" style={{ width: `${accuracy.sentiment.overall}%` }}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Model Performance Overview</CardTitle>
          <CardDescription>Comprehensive view of all ML model accuracies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name="Accuracy" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="language" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="language">By Language</TabsTrigger>
          <TabsTrigger value="contentType">By Content Type</TabsTrigger>
          <TabsTrigger value="category">By Category</TabsTrigger>
        </TabsList>

        <TabsContent value="language" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Accuracy by Language</CardTitle>
              <CardDescription>Model performance across different languages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={languageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="language" />
                    <YAxis domain={[80, 100]} />
                    <Tooltip />
                    <Bar dataKey="accuracy" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contentType" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Accuracy by Content Type</CardTitle>
              <CardDescription>Model performance across different content types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contentTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis domain={[80, 100]} />
                    <Tooltip />
                    <Bar dataKey="accuracy" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="category" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Accuracy by Category</CardTitle>
              <CardDescription>Model performance across different violation categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis domain={[80, 100]} />
                    <Tooltip />
                    <Bar dataKey="accuracy" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Analysis Accuracy</CardTitle>
            <CardDescription>Accuracy breakdown by sentiment type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}\`} fill={COLORS[index % COLORS.length]} />  => (
                      <Cell key={\`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hate Speech Detection</CardTitle>
            <CardDescription>Performance metrics for hate speech detection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Overall Accuracy</span>
                  <span className="text-sm font-medium">{accuracy.hateSpeech.overall.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full"
                    style={{ width: `${accuracy.hateSpeech.overall}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">English</span>
                  <span className="text-sm font-medium">{accuracy.hateSpeech.byLanguage.english.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full"
                    style={{ width: `${accuracy.hateSpeech.byLanguage.english}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Telugu</span>
                  <span className="text-sm font-medium">{accuracy.hateSpeech.byLanguage.telugu.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full"
                    style={{ width: `${accuracy.hateSpeech.byLanguage.telugu}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Telugu-English</span>
                  <span className="text-sm font-medium">
                    {accuracy.hateSpeech.byLanguage["telugu-english"].toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full"
                    style={{ width: `${accuracy.hateSpeech.byLanguage["telugu-english"]}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

