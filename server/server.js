import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import crypto from 'crypto'
import multer from 'multer'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { v2 as cloudinary } from 'cloudinary'
import User from './models/User.js'
import Professional from './models/Professional.js'
import Booking from './models/Booking.js'
import Review from './models/Review.js'
import Notification from './models/Notification.js'
import ChatMessage from './models/ChatMessage.js'
import { hashPassword, verifyPassword } from "./utils/hash.js";
dotenv.config()
import professionalRoutes from "./routes/professionalRoutes.js";
import authRoutes from "./routes/authroutes.js";
import { signToken, verifyToken } from "./utils/jwt.js";
const app = express()
const port = Number(process.env.PORT || 5000)
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, { cors: { origin: '*' } })
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

import {
  memoryUsers,
  memorySessions,
  memoryNotifications,
  memoryOtpCodes,
  memoryChatMessages,
  memoryReviews,
  memoryProfessionals,
  memoryBookings,
} from "./store/memoryStore.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})


let databaseReady = false
let useMemoryStore = true

function sendJson(res, status, data) {
  res.status(status).json(data)
}

function requireAuth(req, res) {
  const verifiedUser = verifyAuth(req)
  if (!verifiedUser) {
    sendJson(res, 401, { success: false, message: 'Not authenticated.' })
    return null
  }

  return verifiedUser
}

function recordId(record) {
  return record?._id?.toString?.() || record?.id?.toString?.() || ''
}

function normalizeBooking(booking) {
  const plain = booking?.toObject ? booking.toObject() : booking
  return plain ? { ...plain, id: recordId(plain) } : null
}

function getBookingRoomId(bookingId) {
  return `booking:${bookingId}`
}

function isAllowedBookingStatus(status) {
  return ['pending', 'approved', 'scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)
}

async function seedProfessionals() {
  const count = await Professional.countDocuments()
  if (count === 0) {
    await Professional.insertMany(memoryProfessionals)
  }
}

async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    console.log('No MONGODB_URI configured. Using in-memory storage for now.')
    return
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, { autoIndex: true })
    databaseReady = true
    useMemoryStore = false
    console.log('MongoDB connected successfully.')
    await seedProfessionals()
  } catch (error) {
    console.warn('MongoDB unavailable, using in-memory storage.', error.message)
    useMemoryStore = true
  }
}

async function getUserByEmail(email) {
  if (databaseReady && !useMemoryStore) {
    return User.findOne({ email: { $regex: `^${email}$`, $options: 'i' } })
  }

  return memoryUsers.find((user) => user.email.toLowerCase() === email.toLowerCase())
}

async function getUserByToken(token) {
  if (databaseReady && !useMemoryStore) {
    const userId = memorySessions.get(token)
    if (!userId) return null
    return User.findById(userId)
  }

  const userId = memorySessions.get(token)
  if (!userId) return null
  return memoryUsers.find((user) => user.id === userId) || null
}

async function getProfessionals() {
  if (databaseReady && !useMemoryStore) {
    return Professional.find().sort({ createdAt: -1 }).lean()
  }

  return memoryProfessionals
}

async function getDashboardBookings(verifiedUser) {
  if (databaseReady && !useMemoryStore) {
    const filter = verifiedUser.role === 'admin'
      ? {}
      : { $or: [{ userId: verifiedUser.id }, { professionalId: verifiedUser.id }, { userEmail: verifiedUser.email }] }
    return Booking.find(filter).sort({ createdAt: -1 }).lean()
  }

  const bookings = verifiedUser.role === 'admin'
    ? memoryBookings
    : memoryBookings.filter((booking) => booking.userId === verifiedUser.id || booking.professionalId === verifiedUser.id || booking.userEmail === verifiedUser.email)

  return bookings.map(normalizeBooking)
}

async function getNotifications(userId) {
  if (databaseReady && !useMemoryStore) {
    return Notification.find({ userId }).sort({ createdAt: -1 }).lean()
  }

  return memoryNotifications.filter((notification) => notification.userId === userId)
}

async function getDashboardUsers() {
  if (databaseReady && !useMemoryStore) {
    return User.find().sort({ createdAt: -1 }).limit(20).lean()
  }

  return memoryUsers.map((user) => ({ id: user.id, name: user.name, email: user.email, role: user.role }))
}

async function markUserNotificationsRead(userId) {
  if (databaseReady && !useMemoryStore) {
    return Notification.updateMany({ userId }, { read: true })
  }

  memoryNotifications.forEach((notification) => {
    if (notification.userId === userId) {
      notification.read = true
    }
  })
  return null
}

async function findBooking(bookingId) {
  if (databaseReady && !useMemoryStore) {
    return Booking.findById(bookingId)
  }

  return memoryBookings.find((booking) => recordId(booking) === bookingId) || null
}

async function updateBookingStatus(bookingId, updates) {
  if (databaseReady && !useMemoryStore) {
    return Booking.findByIdAndUpdate(bookingId, { $set: updates }, { new: true }).lean()
  }

  const booking = await findBooking(bookingId)
  if (!booking) return null
  Object.assign(booking, updates, { updatedAt: new Date().toISOString() })
  return normalizeBooking(booking)
}

async function saveChatMessage(payload) {
  if (databaseReady && !useMemoryStore) {
    const message = await ChatMessage.create(payload)
    return message.toObject()
  }

  const message = {
    id: crypto.randomUUID(),
    ...payload,
    createdAt: new Date().toISOString(),
  }
  memoryChatMessages.push(message)
  return message
}

async function getChatMessages(roomId) {
  if (databaseReady && !useMemoryStore) {
    return ChatMessage.find({ roomId }).sort({ createdAt: 1 }).limit(100).lean()
  }

  return memoryChatMessages.filter((message) => message.roomId === roomId).slice(-100)
}

async function addProfessional(payload) {
  if (databaseReady && !useMemoryStore) {
    const professional = await Professional.create(payload)
    return professional.toObject()
  }

  const professional = {
    id: Date.now(),
    ...payload,
    rating: 4.8,
    distance: 'Newly joined',
    specialties: payload.specialties || ['Verified', 'New profile'],
  }
  memoryProfessionals.unshift(professional)
  return professional
}

async function addNotification(payload) {
  if (databaseReady && !useMemoryStore) {
    const notification = await Notification.create(payload)
    return notification.toObject()
  }

  const notification = {
    id: Date.now(),
    ...payload,
    read: false,
  }
  memoryNotifications.unshift(notification)
  return notification
}

async function addReview(payload) {
  if (databaseReady && !useMemoryStore) {
    const review = await Review.create(payload)
    return review.toObject()
  }

  const review = {
    id: crypto.randomUUID(),
    ...payload,
    createdAt: new Date().toISOString(),
  }
  memoryReviews.unshift(review)
  return review
}

async function getReviews(professionalId) {
  if (databaseReady && !useMemoryStore) {
    return Review.find({ professionalId }).sort({ createdAt: -1 }).lean()
  }

  return memoryReviews.filter((review) => String(review.professionalId) === String(professionalId))
}

async function addBooking(payload) {
  if (databaseReady && !useMemoryStore) {
    const booking = await Booking.create(payload)
    return booking.toObject()
  }

  const booking = {
    id: Date.now(),
    ...payload,
    status: payload.status || 'pending',
    paymentStatus: payload.paymentStatus || 'pending',
    createdAt: new Date().toISOString(),
  }
  memoryBookings.unshift(booking)
  return booking
}

app.use(helmet())
app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '10mb' }))
app.use("/api/auth", authRoutes)
app.use("/api/professionals", professionalRoutes)
app.use(express.urlencoded({ extended: true }))
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }))

app.get('/api/health', (_req, res) => {
  sendJson(res, 200, { success: true, message: 'ApnaKaam backend is running', database: databaseReady ? 'connected' : 'memory' })
})

app.get('/api/services', (_req, res) => {
  sendJson(res, 200, [
    'Electrician',
    'Plumber',
    'Mechanic',
    'Painter',
    'Carpenter',
    'Contractor',
    'Delivery',
    'More Services',
  ])
})
app.post('/api/upload/image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    sendJson(res, 400, { success: false, message: 'Please choose an image file.' })
    return
  }

  if (!req.file.mimetype.startsWith('image/')) {
    sendJson(res, 400, { success: false, message: 'Only image files are allowed.' })
    return
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    const fallbackUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
    sendJson(res, 200, { success: true, imageUrl: fallbackUrl, message: 'Cloudinary is not configured. Using a local preview image for this session.' })
    return
  }

  try {
    const base64 = req.file.buffer.toString('base64')
    const dataUri = `data:${req.file.mimetype};base64,${base64}`
    const result = await cloudinary.uploader.upload(dataUri, { folder: 'apnakaam' })
    sendJson(res, 200, { success: true, imageUrl: result.secure_url })
  } catch (error) {
    sendJson(res, 500, { success: false, message: error.message || 'Image upload failed.' })
  }
})

app.post('/api/bookings', async (req, res) => {
  try {
    const data = req.body || {}
    const requiredFields = ['professionalId', 'professionalName', 'service', 'userName', 'userEmail', 'phone', 'preferredDate', 'message']
    const missingField = requiredFields.find((field) => !data[field])

    if (missingField) {
      sendJson(res, 400, { success: false, message: `${missingField} is required.` })
      return
    }

    const token = req.headers.authorization?.replace('Bearer ', '')
    const verifiedUser = token ? jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') : null
    const booking = await addBooking({
      professionalId: data.professionalId,
      professionalName: data.professionalName,
      service: data.service,
      userName: data.userName,
      userEmail: data.userEmail,
      phone: data.phone,
      preferredDate: data.preferredDate,
      message: data.message,
      status: 'pending',
      paymentStatus: 'pending',
      userId: verifiedUser?.id || data.userId || '',
    })

    if (booking.userId) {
      await addNotification({
        userId: booking.userId,
        message: `Your booking for ${booking.professionalName} is pending confirmation.`,
        type: 'booking',
      })
    }

    sendJson(res, 201, { success: true, booking })
  } catch (error) {
    sendJson(res, 500, { success: false, message: error.message || 'Booking request failed.' })
  }
})


app.get('/api/dashboard', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    const verifiedUser = token ? jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') : null
    if (!verifiedUser) {
      sendJson(res, 401, { success: false, message: 'Not authenticated.' })
      return
    }

    const [bookings, notifications, professionals, users] = await Promise.all([
      getDashboardBookings(verifiedUser),
      getNotifications(verifiedUser.id),
      getProfessionals(),
      getDashboardUsers(),
    ])

    const isAdmin = verifiedUser.role === 'admin'
    const adminData = isAdmin
      ? {
          bookings: bookings.slice(0, 20),
          users,
          professionals,
          overview: {
            totalBookings: bookings.length,
            totalUsers: users.length,
            totalProfessionals: professionals.length,
          },
        }
      : {}

    sendJson(res, 200, {
      success: true,
      user: { id: verifiedUser.id, role: verifiedUser.role },
      bookings,
      notifications,
      professionals,
      users,
      ...adminData,
    })
  } catch (error) {
    sendJson(res, 500, { success: false, message: error.message || 'Dashboard failed.' })
  }
})

app.get('/api/notifications', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    const verifiedUser = token ? jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') : null
    if (!verifiedUser) {
      sendJson(res, 401, { success: false, message: 'Not authenticated.' })
      return
    }

    const notifications = await getNotifications(verifiedUser.id)
    sendJson(res, 200, { success: true, notifications })
  } catch (error) {
    sendJson(res, 500, { success: false, message: error.message || 'Notifications failed.' })
  }
})

app.post('/api/notifications/read', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    const verifiedUser = token ? jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') : null
    if (!verifiedUser) {
      sendJson(res, 401, { success: false, message: 'Not authenticated.' })
      return
    }

    await markUserNotificationsRead(verifiedUser.id)
    sendJson(res, 200, { success: true, message: 'Notifications marked as read.' })
  } catch (error) {
    sendJson(res, 500, { success: false, message: error.message || 'Notifications update failed.' })
  }
})

app.post('/api/reviews', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    const verifiedUser = token ? jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') : null
    if (!verifiedUser) {
      sendJson(res, 401, { success: false, message: 'Not authenticated.' })
      return
    }

    const { professionalId, rating, comment } = req.body || {}
    if (!professionalId || !rating) {
      sendJson(res, 400, { success: false, message: 'Professional and rating are required.' })
      return
    }

    const review = await addReview({
      professionalId,
      userId: verifiedUser.id,
      userName: verifiedUser.name || 'Customer',
      rating,
      comment,
    })

    sendJson(res, 201, { success: true, review })
  } catch (error) {
    sendJson(res, 500, { success: false, message: error.message || 'Review failed.' })
  }
})

app.get('/api/reviews/:professionalId', async (req, res) => {
  try {
    const reviews = await getReviews(req.params.professionalId)
    sendJson(res, 200, { success: true, reviews })
  } catch (error) {
    sendJson(res, 500, { success: false, message: error.message || 'Reviews failed.' })
  }
})

app.patch('/api/bookings/:bookingId/status', async (req, res) => {
  try {
    const { status, adminNote = '', scheduledDate = '' } = req.body || {}
    if (!isAllowedBookingStatus(status)) {
      sendJson(res, 400, { success: false, message: 'Invalid booking status.' })
      return
    }

    const booking = await updateBookingStatus(req.params.bookingId, { status, adminNote, scheduledDate })
    if (!booking) {
      sendJson(res, 404, { success: false, message: 'Booking not found.' })
      return
    }

    if (booking.userId) {
      await addNotification({
        userId: booking.userId,
        message: `Your booking for ${booking.professionalName} is now ${status}.`,
        type: 'booking',
      })
    }

    sendJson(res, 200, { success: true, booking: normalizeBooking(booking) })
  } catch (error) {
    sendJson(res, 500, { success: false, message: error.message || 'Booking status update failed.' })
  }
})

app.post('/api/bookings/:bookingId/pay', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    const verifiedUser = token ? jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') : null
    if (!verifiedUser) {
      sendJson(res, 401, { success: false, message: 'Not authenticated.' })
      return
    }

    const booking = await findBooking(req.params.bookingId)
    if (!booking) {
      sendJson(res, 404, { success: false, message: 'Booking not found.' })
      return
    }

    const updatedBooking = await updateBookingStatus(req.params.bookingId, { paymentStatus: 'paid' })
    sendJson(res, 200, { success: true, booking: normalizeBooking(updatedBooking) })
  } catch (error) {
    sendJson(res, 500, { success: false, message: error.message || 'Payment failed.' })
  }
})

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body || {}

    if (!message) {
      sendJson(res, 400, { success: false, message: 'Message is required.' })
      return
    }

    const openAiKey = process.env.OPENAI_API_KEY
    if (!openAiKey) {
      sendJson(res, 200, { success: true, reply: `Echo: ${message}` })
      return
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: message }],
        max_tokens: 500,
      }),
    })

    const data = await response.json().catch(() => ({}))
    const reply = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || 'Sorry, I could not generate a reply.'
    sendJson(res, 200, { success: true, reply })
  } catch (error) {
    sendJson(res, 500, { success: false, message: error.message || 'Chat service error.' })
  }
})

io.on('connection', (socket) => {
  socket.on('join', (room) => socket.join(room))
  socket.on('message', (payload) => {
    const { room, message, sender } = payload || {}
    if (!room || !message) return
    socket.to(room).emit('message', { sender, message, timestamp: new Date().toISOString() })
  })
})

app.options('*', (_req, res) => sendJson(res, 200, { ok: true }))
app.use((_req, res) => sendJson(res, 404, { error: 'Not found' }))

connectDatabase().then(() => {
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}`)
  })
})
