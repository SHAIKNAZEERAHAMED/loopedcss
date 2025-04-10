"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { nightOwl } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"

const serverCodeExample = `// server.js
const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: '*', // In production, restrict this to your actual domain
    methods: ['GET', 'POST']
  }
});

// Keep track of online users
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // When a user logs in
  socket.on('user:login', (userId) => {
    onlineUsers.set(socket.id, userId);
    
    // Broadcast to all clients that this user is online
    io.emit('user:online', userId);
    
    // Send the current online users to the new connection
    const onlineUserIds = [...new Set(onlineUsers.values())];
    socket.emit('users:online', onlineUserIds);
    
    console.log(\`User \${userId} is online. Total online: \${onlineUsers.size}\`);
  });
  
  // When a user sends a message
  socket.on('message:send', (data) => {
    // data should contain { chatId, message, senderId, recipientId }
    console.log('New message:', data);
    
    // Broadcast to recipients
    io.emit(\`chat:\${data.chatId}\`, data);
    
    // Send notification to recipient
    io.emit(\`notification:\${data.recipientId}\`, {
      type: 'message',
      senderId: data.senderId,
      chatId: data.chatId,
      message: data.message.text.substring(0, 30) + (data.message.text.length > 30 ? '...' : '')
    });
  });
  
  // When a user creates a post
  socket.on('post:create', (data) => {
    // data should contain { postId, authorId, content }
    console.log('New post:', data);
    
    // Broadcast to all users
    io.emit('feed:update', data);
  });
  
  // Handle disconnections
  socket.on('disconnect', () => {
    const userId = onlineUsers.get(socket.id);
    onlineUsers.delete(socket.id);
    
    if (userId) {
      // Check if user has other active connections
      const stillOnline = [...onlineUsers.values()].includes(userId);
      
      if (!stillOnline) {
        // Broadcast that user went offline
        io.emit('user:offline', userId);
        console.log(\`User \${userId} went offline\`);
      }
    }
    
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3001;
http.listen(PORT, () => {
  console.log(\`Socket.io server running on port \${PORT}\`);
});`

const clientCodeExample = `// socket-service.ts
import { io, Socket } from 'socket.io-client';

// Socket.io singleton service
class SocketService {
  private socket: Socket | null = null;
  private connected = false;
  private userId: string | null = null;
  
  // Initialize the socket connection
  initialize(userId: string) {
    if (this.socket) return;
    
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    
    if (!socketUrl) {
      console.error('Socket URL not configured. Please set NEXT_PUBLIC_SOCKET_URL in your environment.');
      return;
    }
    
    this.userId = userId;
    this.socket = io(socketUrl);
    
    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.connected = true;
      
      // Register this user as online
      this.socket?.emit('user:login', userId);
    });
    
    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.connected = false;
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connected = false;
    });
  }
  
  // Clean up resources
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.userId = null;
    }
  }
  
  // Subscribe to events
  subscribe(event: string, callback: (data: any) => void) {
    if (!this.socket) return () => {};
    
    this.socket.on(event, callback);
    
    return () => {
      this.socket?.off(event, callback);
    };
  }
  
  // Subscribe to user-specific events
  subscribeToUser(event: string, callback: (data: any) => void) {
    if (!this.socket || !this.userId) return () => {};
    
    const userEvent = \`\${event}:\${this.userId}\`;
    this.socket.on(userEvent, callback);
    
    return () => {
      this.socket?.off(userEvent, callback);
    };
  }
  
  // Subscribe to chat-specific events
  subscribeToChat(chatId: string, callback: (data: any) => void) {
    if (!this.socket) return () => {};
    
    const chatEvent = \`chat:\${chatId}\`;
    this.socket.on(chatEvent, callback);
    
    return () => {
      this.socket?.off(chatEvent, callback);
    };
  }
  
  // Emit an event
  emit(event: string, data: any) {
    if (!this.socket || !this.connected) {
      console.warn('Socket not connected, cannot emit event:', event);
      return;
    }
    
    this.socket.emit(event, data);
  }
  
  // Check if socket is connected
  isConnected() {
    return this.connected;
  }
}

// Create a singleton instance
const socketService = new SocketService();

export default socketService;`

const usageExample = `// Using the socket service in a component
'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import socketService from '@/lib/socket-service'
import { useToast } from '@/components/ui/use-toast'

export function ChatComponent({ chatId }) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  useEffect(() => {
    if (!user?.uid) return
    
    // Initialize socket connection
    socketService.initialize(user.uid)
    
    // Subscribe to chat messages
    const unsubscribeChat = socketService.subscribeToChat(chatId, (data) => {
      console.log('New message received:', data)
      // Handle incoming message (update UI, etc.)
    })
    
    // Subscribe to notifications
    const unsubscribeNotifications = socketService.subscribeToUser('notification', (data) => {
      toast({
        title: 'New notification',
        description: data.message,
      })
    })
    
    return () => {
      unsubscribeChat()
      unsubscribeNotifications()
    }
  }, [user?.uid, chatId, toast])
  
  const sendMessage = (text) => {
    const message = {
      chatId,
      senderId: user?.uid,
      recipientId: 'other-user-id', // You would get this from your chat data
      message: {
        text,
        timestamp: new Date().toISOString()
      }
    }
    
    // Send via socket
    socketService.emit('message:send', message)
    
    // Also save to database using your existing database service
    // saveMessageToDatabase(message)
  }
  
  return (
    <div>
      {/* Chat UI */}
    </div>
  )
}`

export default function SocketImplementation() {
  const [tab, setTab] = useState("server")

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Socket.io Implementation</CardTitle>
          <CardDescription>
            Complete implementation guide for setting up Socket.io for real-time features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="server">Server Setup</TabsTrigger>
              <TabsTrigger value="client">Client Service</TabsTrigger>
              <TabsTrigger value="usage">Usage Example</TabsTrigger>
            </TabsList>

            <TabsContent value="server" className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Create a Node.js server using Socket.io to handle real-time features. You can deploy this on Vercel,
                Railway, Heroku, or any other hosting service.
              </p>

              <div className="relative">
                <Button
                  className="absolute top-2 right-2 z-10"
                  size="sm"
                  onClick={() => copyToClipboard(serverCodeExample)}
                >
                  Copy
                </Button>
                <SyntaxHighlighter
                  language="javascript"
                  style={nightOwl}
                  showLineNumbers={true}
                  customStyle={{ borderRadius: "0.5rem" }}
                >
                  {serverCodeExample}
                </SyntaxHighlighter>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-sm mt-4">
                <p className="font-medium mb-2 text-amber-800">Deployment Tips:</p>
                <ul className="list-disc pl-5 text-amber-700 space-y-1">
                  <li>For Vercel, use a Serverless Function to create a WebSocket server</li>
                  <li>Railway and Heroku can run the above code directly</li>
                  <li>In production, limit CORS to your application domain</li>
                  <li>Consider using Redis for scaling with multiple server instances</li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="client" className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Create a Socket.io client service in your Next.js application to connect to your socket server.
              </p>

              <div className="relative">
                <Button
                  className="absolute top-2 right-2 z-10"
                  size="sm"
                  onClick={() => copyToClipboard(clientCodeExample)}
                >
                  Copy
                </Button>
                <SyntaxHighlighter
                  language="typescript"
                  style={nightOwl}
                  showLineNumbers={true}
                  customStyle={{ borderRadius: "0.5rem" }}
                >
                  {clientCodeExample}
                </SyntaxHighlighter>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-md text-sm mt-4">
                <p className="font-medium mb-2 text-green-800">Socket Service Features:</p>
                <ul className="list-disc pl-5 text-green-700 space-y-1">
                  <li>Creates a singleton socket connection to avoid multiple connections</li>
                  <li>Handles connection state and reconnections</li>
                  <li>Provides methods for subscribing to general and user-specific events</li>
                  <li>Clean unsubscribe pattern to prevent memory leaks</li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="usage" className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Example of how to use the Socket service in a React component.
              </p>

              <div className="relative">
                <Button className="absolute top-2 right-2 z-10" size="sm" onClick={() => copyToClipboard(usageExample)}>
                  Copy
                </Button>
                <SyntaxHighlighter
                  language="typescript"
                  style={nightOwl}
                  showLineNumbers={true}
                  customStyle={{ borderRadius: "0.5rem" }}
                >
                  {usageExample}
                </SyntaxHighlighter>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-sm mt-4">
                <p className="font-medium mb-2 text-blue-800">Implementation Notes:</p>
                <ul className="list-disc pl-5 text-blue-700 space-y-1">
                  <li>Initialize the socket when the user logs in</li>
                  <li>Use the cleanup function to unsubscribe from events when the component unmounts</li>
                  <li>You still need to save messages to the database for persistence</li>
                  <li>The socket service is for real-time updates, not for replacing your database</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

