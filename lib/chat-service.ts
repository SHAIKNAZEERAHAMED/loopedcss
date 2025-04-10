import { db } from "./firebase/config"
import { ref, push, set, get, update, remove, query, orderByChild, limitToLast, onValue, off } from "firebase/database"

export interface ChatMessage {
  id: string
  chatId: string
  senderId: string
  senderName: string
  senderPhotoURL?: string
  content: string
  timestamp: number
  isRead: { [userId: string]: boolean }
  isSafe: boolean
  safetyCategory?: string
}

export interface Chat {
  id: string
  participants: string[]
  participantNames: { [userId: string]: string }
  participantPhotos: { [userId: string]: string }
  lastMessage: string
  lastMessageTime: number
  unreadCount: { [userId: string]: number }
  createdAt: number
  updatedAt: number
}

export async function createChat(
  participants: string[],
  participantData: { [userId: string]: { name: string; photoURL?: string } },
): Promise<Chat> {
  const chatsRef = ref(db, "chats")
  const newChatRef = push(chatsRef)
  const chatId = newChatRef.key as string

  const participantNames: { [userId: string]: string } = {}
  const participantPhotos: { [userId: string]: string } = {}
  const unreadCount: { [userId: string]: number } = {}

  // Prepare participant data
  for (const userId in participantData) {
    participantNames[userId] = participantData[userId].name
    participantPhotos[userId] = participantData[userId].photoURL || ""
    unreadCount[userId] = 0
  }

  const chat: Chat = {
    id: chatId,
    participants,
    participantNames,
    participantPhotos,
    lastMessage: "",
    lastMessageTime: Date.now(),
    unreadCount,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  await set(newChatRef, chat)

  // Add chat to each participant's chats list
  for (const userId of participants) {
    const userChatRef = ref(db, `user-chats/${userId}/${chatId}`)
    await set(userChatRef, true)
  }

  return chat
}

export async function sendMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  senderPhotoURL: string | undefined,
  content: string,
  isSafe = true,
  safetyCategory = "safe",
): Promise<ChatMessage> {
  // Add message to chat
  const messagesRef = ref(db, `chat-messages/${chatId}`)
  const newMessageRef = push(messagesRef)
  const messageId = newMessageRef.key as string

  // Get chat participants
  const chatRef = ref(db, `chats/${chatId}`)
  const chatSnapshot = await get(chatRef)

  if (!chatSnapshot.exists()) {
    throw new Error("Chat not found")
  }

  const chat = chatSnapshot.val() as Chat
  const participants = chat.participants

  // Prepare isRead object (sender has read it, others haven't)
  const isRead: { [userId: string]: boolean } = {}
  for (const userId of participants) {
    isRead[userId] = userId === senderId
  }

  const message: ChatMessage = {
    id: messageId,
    chatId,
    senderId,
    senderName,
    senderPhotoURL,
    content,
    timestamp: Date.now(),
    isRead,
    isSafe,
    safetyCategory,
  }

  await set(newMessageRef, message)

  // Update chat with last message
  const unreadCount = { ...chat.unreadCount }

  // Increment unread count for all participants except sender
  for (const userId of participants) {
    if (userId !== senderId) {
      unreadCount[userId] = (unreadCount[userId] || 0) + 1
    }
  }

  await update(chatRef, {
    lastMessage: content,
    lastMessageTime: message.timestamp,
    unreadCount,
    updatedAt: message.timestamp,
  })

  return message
}

export async function markMessagesAsRead(chatId: string, userId: string): Promise<void> {
  // Get chat
  const chatRef = ref(db, `chats/${chatId}`)
  const chatSnapshot = await get(chatRef)

  if (!chatSnapshot.exists()) {
    throw new Error("Chat not found")
  }

  const chat = chatSnapshot.val() as Chat

  // Reset unread count for this user
  const unreadCount = { ...chat.unreadCount }
  unreadCount[userId] = 0

  await update(chatRef, { unreadCount })

  // Get recent messages
  const messagesRef = ref(db, `chat-messages/${chatId}`)
  const messagesQuery = query(messagesRef, orderByChild("timestamp"), limitToLast(20))
  const messagesSnapshot = await get(messagesQuery)

  if (!messagesSnapshot.exists()) return

  // Mark messages as read
  const updates: { [path: string]: boolean } = {}

  messagesSnapshot.forEach((childSnapshot) => {
    const message = childSnapshot.val() as ChatMessage

    if (!message.isRead[userId]) {
      updates[`chat-messages/${chatId}/${childSnapshot.key}/isRead/${userId}`] = true
    }
  })

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates)
  }
}

export async function getChat(chatId: string): Promise<Chat | null> {
  const chatRef = ref(db, `chats/${chatId}`)
  const snapshot = await get(chatRef)

  if (snapshot.exists()) {
    return snapshot.val() as Chat
  }

  return null
}

export async function getUserChats(userId: string): Promise<Chat[]> {
  const userChatsRef = ref(db, `user-chats/${userId}`)
  const snapshot = await get(userChatsRef)

  if (!snapshot.exists()) return []

  const chatIds = Object.keys(snapshot.val())
  const chats: Chat[] = []

  for (const chatId of chatIds) {
    const chat = await getChat(chatId)
    if (chat) chats.push(chat)
  }

  // Sort by lastMessageTime in descending order (newest first)
  return chats.sort((a, b) => b.lastMessageTime - a.lastMessageTime)
}

export async function getChatMessages(chatId: string, limit = 50): Promise<ChatMessage[]> {
  const messagesRef = ref(db, `chat-messages/${chatId}`)
  const messagesQuery = query(messagesRef, orderByChild("timestamp"), limitToLast(limit))

  const snapshot = await get(messagesQuery)

  if (!snapshot.exists()) return []

  const messages: ChatMessage[] = []
  snapshot.forEach((childSnapshot) => {
    messages.push(childSnapshot.val() as ChatMessage)
  })

  // Sort by timestamp in ascending order (oldest first)
  return messages.sort((a, b) => a.timestamp - b.timestamp)
}

export function subscribeToChat(chatId: string, callback: (chat: Chat | null) => void): () => void {
  const chatRef = ref(db, `chats/${chatId}`)

  const handleSnapshot = (snapshot: any) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as Chat)
    } else {
      callback(null)
    }
  }

  onValue(chatRef, handleSnapshot)

  // Return unsubscribe function
  return () => off(chatRef, "value", handleSnapshot)
}

export function subscribeToChatMessages(
  chatId: string,
  callback: (messages: ChatMessage[]) => void,
  limit = 50,
): () => void {
  const messagesRef = ref(db, `chat-messages/${chatId}`)
  const messagesQuery = query(messagesRef, orderByChild("timestamp"), limitToLast(limit))

  const handleSnapshot = (snapshot: any) => {
    if (!snapshot.exists()) {
      callback([])
      return
    }

    const messages: ChatMessage[] = []
    snapshot.forEach((childSnapshot: any) => {
      messages.push(childSnapshot.val() as ChatMessage)
    })

    // Sort by timestamp in ascending order (oldest first)
    callback(messages.sort((a, b) => a.timestamp - b.timestamp))
  }

  onValue(messagesQuery, handleSnapshot)

  // Return unsubscribe function
  return () => off(messagesQuery, "value", handleSnapshot)
}

export function subscribeToUserChats(userId: string, callback: (chats: Chat[]) => void): () => void {
  const userChatsRef = ref(db, `user-chats/${userId}`)

  const handleSnapshot = async (snapshot: any) => {
    if (!snapshot.exists()) {
      callback([])
      return
    }

    const chatIds = Object.keys(snapshot.val())
    const chats: Chat[] = []

    for (const chatId of chatIds) {
      const chatRef = ref(db, `chats/${chatId}`)
      const chatSnapshot = await get(chatRef)

      if (chatSnapshot.exists()) {
        chats.push(chatSnapshot.val() as Chat)
      }
    }

    // Sort by lastMessageTime in descending order (newest first)
    callback(chats.sort((a, b) => b.lastMessageTime - a.lastMessageTime))
  }

  onValue(userChatsRef, handleSnapshot)

  // Return unsubscribe function
  return () => off(userChatsRef, "value", handleSnapshot)
}

export function subscribeToUserStatus(
  userId: string,
  callback: (status: "online" | "offline" | "away") => void,
): () => void {
  const statusRef = ref(db, `users/${userId}/status`)

  const handleSnapshot = (snapshot: any) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as "online" | "offline" | "away")
    } else {
      callback("offline")
    }
  }

  onValue(statusRef, handleSnapshot)

  // Return unsubscribe function
  return () => off(statusRef, "value", handleSnapshot)
}

export async function setTypingStatus(chatId: string, userId: string, isTyping: boolean): Promise<void> {
  const typingRef = ref(db, `typing/${chatId}/${userId}`)

  if (isTyping) {
    await set(typingRef, Date.now())
  } else {
    await remove(typingRef)
  }
}

export function subscribeToTypingStatus(chatId: string, callback: (typingUsers: string[]) => void): () => void {
  const typingRef = ref(db, `typing/${chatId}`)

  const handleSnapshot = (snapshot: any) => {
    if (!snapshot.exists()) {
      callback([])
      return
    }

    const typingData = snapshot.val()
    const now = Date.now()
    const typingUsers: string[] = []

    // Consider a user typing if their last typing event was within the last 5 seconds
    for (const userId in typingData) {
      const lastTyped = typingData[userId]
      if (now - lastTyped < 5000) {
        typingUsers.push(userId)
      }
    }

    callback(typingUsers)
  }

  onValue(typingRef, handleSnapshot)

  // Return unsubscribe function
  return () => off(typingRef, "value", handleSnapshot)
}


