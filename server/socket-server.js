const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")
require('dotenv').config()

const app = express()
const server = http.createServer(app)

// Environment variables with fallbacks
const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000"
const PORT = process.env.PORT || 3001
const NODE_ENV = process.env.NODE_ENV || "development"

// Configure CORS with environment-specific settings
const corsOptions = {
  origin: NODE_ENV === "production" 
    ? [frontendURL] 
    : [frontendURL, "http://localhost:3000"],
  methods: ["GET", "POST"],
  credentials: true,
}

app.use(cors(corsOptions))

// Create Socket.IO server with CORS configuration
const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Store online users with cleanup mechanism
const onlineUsers = new Map()
const activeModerators = new Set()

// Cleanup inactive users every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [uid, user] of onlineUsers.entries()) {
    if (now - user.lastActive > 300000) { // 5 minutes
      onlineUsers.delete(uid)
      io.emit("user-status-change", {
        uid,
        status: "offline",
      })
    }
  }
}, 300000)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err)
  res.status(500).json({ error: "Internal server error" })
})

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log("User connected:", socket.id)

  // User authentication with error handling
  socket.on("authenticate", (userData) => {
    try {
      if (!userData || !userData.uid) {
        throw new Error("Invalid user data")
      }

      // Store user data with timestamp
      onlineUsers.set(userData.uid, {
        socketId: socket.id,
        userData,
        lastActive: Date.now(),
      })

      // Broadcast user online status
      io.emit("user-status-change", {
        uid: userData.uid,
        status: "online",
      })

      // Check if user is a moderator
      if (userData.role === "admin" || userData.role === "moderator") {
        activeModerators.add(socket.id)
      }

      console.log(`User authenticated: ${userData.uid} (${userData.displayName})`)
    } catch (error) {
      console.error("Authentication error:", error)
      socket.emit("error", { message: "Authentication failed" })
    }
  })

  // Handle private messages with error handling
  socket.on("private-message", (data) => {
    try {
      const { to, message } = data
      if (!to || !message) {
        throw new Error("Invalid message data")
      }

      const recipient = onlineUsers.get(to)
      if (recipient) {
        io.to(recipient.socketId).emit("private-message", {
          from: data.from,
          message,
          timestamp: Date.now(),
        })
      }
    } catch (error) {
      console.error("Message error:", error)
      socket.emit("error", { message: "Failed to send message" })
    }
  })

  // Handle typing indicators
  socket.on("typing", (data) => {
    try {
      const { to, isTyping } = data
      const recipient = onlineUsers.get(to)
      if (recipient) {
        io.to(recipient.socketId).emit("typing", {
          from: data.from,
          isTyping,
        })
      }
    } catch (error) {
      console.error("Typing indicator error:", error)
    }
  })

  // Handle moderation with error handling
  socket.on("moderation-action", (data) => {
    try {
      if (!data.action || !data.itemType) {
        throw new Error("Invalid moderation data")
      }

      activeModerators.forEach((moderatorSocketId) => {
        io.to(moderatorSocketId).emit("moderation-action", data)
      })

      if (data.userId && onlineUsers.has(data.userId)) {
        const userSocketId = onlineUsers.get(data.userId).socketId
        io.to(userSocketId).emit("moderation-notification", {
          action: data.action,
          itemType: data.itemType,
          message: data.message,
          timestamp: Date.now(),
        })
      }
    } catch (error) {
      console.error("Moderation error:", error)
      socket.emit("error", { message: "Moderation action failed" })
    }
  })

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id)

    let disconnectedUid = null
    for (const [uid, user] of onlineUsers.entries()) {
      if (user.socketId === socket.id) {
        disconnectedUid = uid
        break
      }
    }

    if (disconnectedUid) {
      onlineUsers.delete(disconnectedUid)
      io.emit("user-status-change", {
        uid: disconnectedUid,
        status: "offline",
      })
    }

    activeModerators.delete(socket.id)
  })
})

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: Date.now(),
  })
})

// Start server with error handling
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT} in ${NODE_ENV} mode`)
})

// Handle server errors
server.on("error", (error) => {
  console.error("Server error:", error)
  process.exit(1)
})

// Handle process termination
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Closing server...")
  server.close(() => {
    console.log("Server closed")
    process.exit(0)
  })
})

