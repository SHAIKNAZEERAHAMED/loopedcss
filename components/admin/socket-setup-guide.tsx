"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"

export default function SocketSetupGuide() {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || ""

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Socket URL Configuration</AlertTitle>
        <AlertDescription>
          Setting up the Socket URL is required for enabling real-time features such as chat, notifications, and user
          status updates.
        </AlertDescription>
      </Alert>

      {socketUrl ? (
        <Alert variant="success" className="bg-green-50 border-green-200 text-green-800">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Socket URL Configured</AlertTitle>
          <AlertDescription>
            Your Socket URL is configured as: <code className="bg-green-100 px-1 py-0.5 rounded">{socketUrl}</code>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Socket URL Missing</AlertTitle>
          <AlertDescription>
            Your Socket URL is not yet configured. Follow the setup instructions below to enable real-time features.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="vercel">
        <TabsList>
          <TabsTrigger value="vercel">Vercel Deployment</TabsTrigger>
          <TabsTrigger value="self-hosted">Self-Hosted</TabsTrigger>
          <TabsTrigger value="local">Local Development</TabsTrigger>
        </TabsList>

        <TabsContent value="vercel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vercel Deployment Configuration</CardTitle>
              <CardDescription>
                Follow these steps to configure the Socket URL for your Vercel deployment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal pl-5 space-y-3">
                <li>
                  <strong>Create a Socket Server:</strong>
                  <p>
                    Deploy a WebSocket server using services like Vercel Serverless Functions, Socket.io, or Pusher.
                  </p>
                </li>
                <li>
                  <strong>Set Environment Variable:</strong>
                  <p>Go to your Vercel project dashboard → Settings → Environment Variables.</p>
                </li>
                <li>
                  <strong>Add Socket URL:</strong>
                  <p>
                    Add a new environment variable with the key{" "}
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">NEXT_PUBLIC_SOCKET_URL</code> and
                    the value set to your WebSocket server URL.
                  </p>
                </li>
                <li>
                  <strong>Redeploy:</strong>
                  <p>Redeploy your application for the changes to take effect.</p>
                </li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="self-hosted" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Self-Hosted Server Configuration</CardTitle>
              <CardDescription>
                Follow these steps to configure the Socket URL for a self-hosted deployment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal pl-5 space-y-3">
                <li>
                  <strong>Set Up Socket Server:</strong>
                  <p>Install and configure a WebSocket server like Socket.io on your hosting platform.</p>
                </li>
                <li>
                  <strong>Create Environment File:</strong>
                  <p>
                    Create or edit the <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">.env</code>{" "}
                    file in your project root.
                  </p>
                </li>
                <li>
                  <strong>Add Socket URL:</strong>
                  <p>Add the following line to your .env file:</p>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2">
                    NEXT_PUBLIC_SOCKET_URL=https://your-socket-server.com
                  </pre>
                </li>
                <li>
                  <strong>Restart Server:</strong>
                  <p>Restart your server to apply the new environment variable.</p>
                </li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="local" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Local Development Configuration</CardTitle>
              <CardDescription>Follow these steps to configure the Socket URL for local development.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal pl-5 space-y-3">
                <li>
                  <strong>Set Up Local Socket Server:</strong>
                  <p>Create a simple Socket.io server in your project or as a separate service.</p>
                </li>
                <li>
                  <strong>Create Local Environment File:</strong>
                  <p>
                    Create or edit the{" "}
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">.env.local</code> file in your
                    project root.
                  </p>
                </li>
                <li>
                  <strong>Add Socket URL:</strong>
                  <p>Add the following line to your .env.local file:</p>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2">
                    NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
                  </pre>
                </li>
                <li>
                  <strong>Restart Development Server:</strong>
                  <p>Restart your Next.js development server to apply the new environment variable.</p>
                </li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

