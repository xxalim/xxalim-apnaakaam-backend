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

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 5000)
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, { cors: { origin: '*' } })
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

const memoryUsers = []
const memorySessions = new Map()
const memoryNotifications = []
const memoryOtpCodes = new Map()
const memoryChatMessages = []
const memoryReviews = []
const memoryProfessionals = [
  {
    id: 1,
    name: 'Aman Verma',
    service: 'Electrician',
    location: 'Noida',
    experienceYears: 8,
    completedJobs: 180,
    rating: 4.8,
    distance: '2.3 km',
    description: 'Fast and reliable home wiring, fan fitting, and switchboard repair.',
    specialties: ['Wiring', 'Fans', 'Appliances'],
    imageUrl: '',
  },
  {
    id: 2,
    name: 'Ravi Sharma',
    service: 'Plumber',
    location: 'Noida',
    experienceYears: 12,
    completedJobs: 260,
    rating: 4.9,
    distance: '4.1 km',
    description: 'Skilled in leak fixing, water tank installation, and bathroom plumbing.',
    specialties: ['Leak repair', 'Pipes', 'Water tanks'],
    imageUrl: '',
  },
]

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'customer' },
    imageUrl: String,
  },
  { timestamps: true },
)

const professionalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    service: { type: String, required: true },
    location: { type: String, required: true },
    experienceYears: { type: Number, required: true },
    completedJobs: { type: Number, required: true },
    phone: String,
    description: String,
    rating: { type: Number, default: 4.8 },
    distance: { type: String, default: 'Newly joined' },
    specialties: { type: [String], default: ['Verified'] },
    imageUrl: String,
    ownerUserId: String,
    bio: String,
    availability: String,
    rate: String,
  },
  { timestamps: true },
)

const bookingSchema = new mongoose.Schema(
  {
    professionalId: mongoose.Schema.Types.Mixed,
    professionalName: String,
    service: String,
    userName: String,
    userEmail: String,
    phone: String,
    preferredDate: String,
    message: String,
    status: { type: String, default: 'pending' },
    paymentStatus: { type: String, default: 'pending' },
    adminNote: String,
    scheduledDate: String,
    userId: String,
  },
  { timestamps: true },
)

const reviewSchema = new mongoose.Schema(
  {
    professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional' },
    userId: String,
    userName: String,
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
  },
  { timestamps: true },
)

const notificationSchema = new mongoose.Schema(
  {
    userId: String,
    message: String,
    type: { type: String, default: 'info' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
)

const chatMessageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    bookingId: String,
    senderId: String,
    senderName: String,
    senderRole: String,
    message: { type: String, required: true },
  },
  { timestamps: true },
)

const User = mongoose.model('User', userSchema)
const Professional = mongoose.model('Professional', professionalSchema)
const Booking = mongoose.model('Booking', bookingSchema)
const Review = mongoose.model('Review', reviewSchema)
const Notification = mongoose.model('Notification', notificationSchema)
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema)

let databaseReady = false
let useMemoryStore = true

function sendJson(res, status, data) {
  res.status(status).json(data)
}

function hashPassword(password) {
  const salt = crypto.randomBytes(8).toString('hex')
  const hash = crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex')
  return `${salt}:${hash}`
}

function signToken(user) {
  return jwt.sign({ id: user.id || user._id?.toString(), name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: '7d',
  })
}

function verifyPassword(password, storedPassword) {
  const [salt, hash] = storedPassword.split(':')
  const expectedHash = crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex')
  return hash === expectedHash
}

function verifyAuth(req) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return null

  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
  } catch {
    return null
  }
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

const memoryBookings = []

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

app.get('/api/professionals', async (_req, res) => {
  try {
    const professionals = await getProfessionals()
    sendJson(res, 200, professionals)
  } catch (error) {
    sendJson(res, 500, { success: false, message: error.message || 'Failed to load professionals.' })
  }
})

app.post('/api/professionals', async (req, res) => {
  try {
    const data = req.body || {}
    const verifiedUser = verifyAuth(req)
    const professional = await addProfessional({
      name: data.name,
      service: data.service,
      location: data.location,
      experienceYears: Number(data.experienceYears) || 1,
      completedJobs: Number(data.completedJobs) || 0,
      phone: data.phone || '',
      description: data.description || '',
      imageUrl: data.imageUrl || '',
      specialties: data.specialties || ['Verified', 'New profile'],
      ownerUserId: verifiedUser?.id || data.ownerUserId || '',
      bio: data.bio || data.description || '',
      availability: data.availability || 'Available today',
      rate: data.rate || '',
    })

    sendJson(res, 201, { success: true, professional })
  } catch (error) {
    sendJson(res, 500, { success: false, message: error.message || 'Failed to register professional.' })
  }
})

app.post('/api/professionals/profile', async (req, res) => {
  try {
    const verifiedUser = requireAuth(req, res)
    if (!verifiedUser) return

    const data = req.body || {}
    const profilePayload = {
      bio: data.bio || '',
      availability: data.availability || 'Available today',
      rate: data.rate || '',
      imageUrl: data.imageUrl || '',
    }

    if (databaseReady && !useMemoryStore) {
      const profile = await Professional.findOneAndUpdate(
        { ownerUserId: verifiedUser.id },
        {
          $set: {
            ownerUserId: verifiedUser.id,
            name: data.name || verifiedUser.name || 'Professional',
            service: data.service || 'General Service',
            location: data.location || 'Local area',
            experienceYears: Number(data.experienceYears) || 1,
            completedJobs: Number(data.completedJobs) || 0,
            description: profilePayload.bio,
            ...profilePayload,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).lean()
      sendJson(res, 200, { success: true, profile })
      return
    }

    let profile = memoryProfessionals.find((professional) => professional.ownerUserId === verifiedUser.id)
    if (!profile) {
      profile = {
        id: Date.now(),
        ownerUserId: verifiedUser.id,
        name: data.name || verifiedUser.name || 'Professional',
        service: data.service || 'General Service',
        location: data.location || 'Local area',
        experienceYears: Number(data.experienceYears) || 1,
        completedJobs: Number(data.completedJobs) || 0,
        rating: 4.8,
        distance: 'Newly joined',
        specialties: ['Verified', 'Updated profile'],
        imageUrl: profilePayload.imageUrl,
      }
      memoryProfessionals.unshift(profile)
    }

    Object.assign(profile, {
      ...profilePayload,
      description: profilePayload.bio || profile.description,
    })

    sendJson(res, 200, { success: true, profile })
  } catch (error) {
    sendJson(res, 500, { success: false, message: error.message || 'Could not update profile.' })
  }
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

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role = 'customer' } = req.body || {}

    if (!name || !email || !password) {
      sendJson(res, 400, { success: false, message: 'Please fill in all required fields.' })
      return
    }

    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      sendJson(res, 409, { success: false, message: 'An account with this email already exists.' })
      return
    }

    const newUser = {
      id: crypto.randomUUID(),
      name,
      email,
      role,
      password: hashPassword(password),
    }

    if (databaseReady && !useMemoryStore) {
      const createdUser = await User.create(newUser)
      const token = signToken(createdUser)
      memorySessions.set(token, createdUser._id.toString())
      sendJson(res, 201, {
        success: true,
        message: 'Account created successfully.',
        token,
        user: { id: createdUser._id.toString(), name: createdUser.name, email: createdUser.email, role: createdUser.role },
      })
      return
    }

    memoryUsers.push(newUser)
    const token = signToken(newUser)
    memorySessions.set(token, newUser.id)
    sendJson(res, 201, {
      success: true,
      message: 'Account created successfully.',
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
    })
  } catch (error) {
    sendJson(res, 500, { success: false, message: error.message || 'Signup failed.' })
  }
})

app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email, phone } = req.body || {}
    if (!email || !phone) {
      sendJson(res, 400, { success: false, message: 'Email and phone are required.' })
      return
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    memoryOtpCodes.set(`${email}:${phone}`, { code, expiresAt: Date.now() + 10 * 60 * 1000 })

    sendJson(res, 200, {
      success: true,
      message: 'OTP sent successfully.',
      debugCode: code,
    })
  } catch (error) {
    sendJson(res, 500, { success: false, message: error.message || 'OTP send failed.' })
  }
})

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, phone, code } = req.body || {}
    if (!email || !phone || !code) {
      sendJson(res, 400, { success: false, message: 'Email, phone, and code are required.' })
      return
    }

    const stored = memoryOtpCodes.get(`${email}:${phone}`)
    if (!stored) {
      sendJson(res, 400, { success: false, message: 'No OTP found for this contact.' })
      return
    }

    if (Date.now() > stored.expiresAt) {
      memoryOtpCodes.delete(`${email}:${phone}`)
      sendJson(res, 400, { success: false, message: 'OTP expired.' })
      return
    }

    if (stored.code !== code) {
      sendJson(res, 400, { success: false, message: 'Invalid OTP.' })
      return
    }

    memoryOtpCodes.delete(`${email}:${phone}`)
    sendJson(res, 200, { success: true, message: 'OTP verified successfully.', verified: true })
  } catch (error) {
    sendJson(res, 500, { success: false, message: error.message || 'OTP verification failed.' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}

    if (!email || !password) {
      sendJson(res, 400, { success: false, message: 'Email and password are required.' })
      return
    }

    const user = await getUserByEmail(email)
    if (!user || !verifyPassword(password, user.password)) {
      sendJson(res, 401, { success: false, message: 'Invalid email or password.' })
      return
    }

    const token = signToken(user)
    const userId = databaseReady && !useMemoryStore ? user._id.toString() : user.id
    memorySessions.set(token, userId)

    sendJson(res, 200, {
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    sendJson(res, 500, { success: false, message: error.message || 'Login failed.' })
  }
})

app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    const user = token ? await getUserByToken(token) : null

    if (!user) {
      sendJson(res, 401, { success: false, message: 'Not authenticated.' })
      return
    }

    sendJson(res, 200, {
      success: true,
      user: { id: user.id || user._id.toString(), name: user.name, email: user.email, role: user.role },
    })
  } catch (error) {
    sendJson(res, 500, { success: false, message: error.message || 'Session lookup failed.' })
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
