'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';

export default function SocketSetupDashboard() {
  const [socketUrl, setSocketUrl] = useState('');
  const [status, setStatus] = useState('disconnected');

  const handleSave = async () => {
    // TODO: Implement saving socket URL to Firebase
    console.log('Saving socket URL:', socketUrl);
  };

  const handleTest = async () => {
    // TODO: Implement testing socket connection
    console.log('Testing socket connection:', socketUrl);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Socket Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="socketUrl" className="block text-sm font-medium mb-2">
                Socket URL
              </label>
              <Input
                id="socketUrl"
                value={socketUrl}
                onChange={(e) => setSocketUrl(e.target.value)}
                placeholder="wss://your-socket-server.com"
                className="max-w-xl"
              />
            </div>

            <div className="flex items-center gap-4">
              <Button onClick={handleSave}>
                <Icons.save className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
              <Button variant="outline" onClick={handleTest}>
                <Icons.zap className="h-4 w-4 mr-2" />
                Test Connection
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm">
                {status === 'connected' ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connection Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert">
            <h3>Setting Up Your Socket Server</h3>
            <p>
              To enable real-time features like chat and notifications, you need to configure a WebSocket
              server. Follow these steps:
            </p>
            <ol>
              <li>Set up a WebSocket server (e.g., using Socket.IO)</li>
              <li>Deploy your server and obtain the WebSocket URL</li>
              <li>Enter the URL above and test the connection</li>
              <li>Save the configuration once the test is successful</li>
            </ol>
            <p className="text-sm text-muted-foreground">
              Note: The WebSocket URL should start with wss:// for secure connections
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 