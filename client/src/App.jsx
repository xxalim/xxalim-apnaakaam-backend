import { useEffect, useMemo, useState } from 'react'
import './App.css'
import Chat from './Chat'
import { createBooking, createProfessional, createReview, fetchDashboardData, fetchHealth, fetchProfessionals, fetchReviews, fetchServices, getCurrentUser, loginUser, markNotificationsRead, payBooking, sendChatMessage, sendOtp, signupUser, updateProfessionalProfile, uploadProfessionalImage, verifyOtp } from './api'

const serviceOptions = [
  'Mechanical',
  'Electrician',
  'Plumber',
  'Contractor',
  'Builder',
  'Painter',
  'Carpenter',
  'Delivery Person',
]

const initialProfessionals = [
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
  },
  {
    id: 3,
    name: 'Kunal Mehta',
    service: 'Painter',
    location: 'Gurugram',
    experienceYears: 6,
    completedJobs: 140,
    rating: 4.7,
    distance: '5.8 km',
    description: 'Interior and exterior painting with neat finishing and quick turnarounds.',
    specialties: ['Interior', 'Exterior', 'Wall coating'],
  },
  {
    id: 4,
    name: 'Naveed Khan',
    service: 'Contractor',
    location: 'Delhi',
    experienceYears: 15,
    completedJobs: 320,
    rating: 5.0,
    distance: '7.2 km',
    description: 'Trusted for home renovation, site supervision, and project coordination.',
    specialties: ['Renovation', 'Site work', 'Planning'],
  },
]

const serviceCards = [
  { title: 'Electrician', accent: 'elec' },
  { title: 'Plumber', accent: 'plumb' },
  { title: 'Mechanic', accent: 'mech' },
  { title: 'Painter', accent: 'paint' },
  { title: 'Carpenter', accent: 'carp' },
  { title: 'Contractor', accent: 'build' },
  { title: 'Delivery', accent: 'drive' },
  { title: 'More Services', accent: 'other' },
]

function App() {
  const [professionals, setProfessionals] = useState(initialProfessionals)
  const [search, setSearch] = useState({ service: 'Electrician', location: 'Noida', rating: '', experience: '', tag: '' })
  const [selectedProfessional, setSelectedProfessional] = useState(null)
  const [actionMessage, setActionMessage] = useState('Showing nearby professionals based on your search.')
  const [professionalForm, setProfessionalForm] = useState({
    name: '',
    service: 'Mechanical',
    location: '',
    experienceYears: '',
    completedJobs: '',
    phone: '',
    description: '',
  })
  const [selectedImage, setSelectedImage] = useState(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [registrationMessage, setRegistrationMessage] = useState('')
  const [modalMode, setModalMode] = useState('chat')
  const [modalMessages, setModalMessages] = useState([])
  const [bookingForm, setBookingForm] = useState({ name: '', email: '', phone: '', preferredDate: '', message: '' })
  const [bookingStatus, setBookingStatus] = useState('')
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [activeScene, setActiveScene] = useState(0)
  const [backendStatus, setBackendStatus] = useState('Connecting...')
  const [serviceList, setServiceList] = useState(serviceCards.map((card) => card.title))
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', role: 'customer', phone: '' })
  const [authMessage, setAuthMessage] = useState('')
  const [dashboardData, setDashboardData] = useState(null)
  const [reviewForm, setReviewForm] = useState({ professionalId: '', rating: '5', comment: '' })
  const [reviewMessage, setReviewMessage] = useState('')
  const [otpStage, setOtpStage] = useState('idle')
  const [otpMessage, setOtpMessage] = useState('')
  const [otpPayload, setOtpPayload] = useState({ email: '', phone: '', code: '' })
  const [workerProfile, setWorkerProfile] = useState({ bio: '', availability: 'Available today', rate: '500' })
  const [workerProfileMessage, setWorkerProfileMessage] = useState('')
  const [professionalReviews, setProfessionalReviews] = useState({})
  const [authUser, setAuthUser] = useState(() => {
    if (typeof window === 'undefined') return null
    const storedUser = window.localStorage.getItem('apnakaam-user')
    return storedUser ? JSON.parse(storedUser) : null
  })
  const [authToken, setAuthToken] = useState(() => {
    if (typeof window === 'undefined') return ''
    return window.localStorage.getItem('apnakaam-token') || ''
  })

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveScene((current) => (current + 1) % serviceCards.length)
    }, 3900)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    async function loadBackendData() {
      try {
        const health = await fetchHealth()
        const services = await fetchServices()
        const response = await fetchProfessionals()
        setBackendStatus(health.message)
        setServiceList(services)
        if (Array.isArray(response)) {
          setProfessionals(response)
        }
      } catch (error) {
        setBackendStatus('Backend unavailable')
      }
    }

    loadBackendData()
  }, [])

  useEffect(() => {
    if (!authToken) return

    async function restoreSession() {
      try {
        const response = await getCurrentUser(authToken)
        if (response.success && response.user) {
          setAuthUser(response.user)
        }
      } catch {
        setAuthToken('')
        setAuthUser(null)
        window.localStorage.removeItem('apnakaam-token')
        window.localStorage.removeItem('apnakaam-user')
      }
    }

    restoreSession()
  }, [authToken])

  useEffect(() => {
    if (authToken) {
      window.localStorage.setItem('apnakaam-token', authToken)
    } else {
      window.localStorage.removeItem('apnakaam-token')
    }
  }, [authToken])

  useEffect(() => {
    if (!authUser || !authToken) {
      setDashboardData(null)
      return
    }

    let ignore = false

    async function loadDashboard() {
      try {
        const response = await fetchDashboardData(authToken)
        if (!ignore && response.success) {
          setDashboardData(response)
        }
      } catch {
        if (!ignore) {
          setDashboardData(null)
        }
      }
    }

    loadDashboard()
    return () => {
      ignore = true
    }
  }, [authUser, authToken])

  useEffect(() => {
    if (authUser) {
      window.localStorage.setItem('apnakaam-user', JSON.stringify(authUser))
    } else {
      window.localStorage.removeItem('apnakaam-user')
    }
  }, [authUser])

  const filteredProfessionals = useMemo(() => {
    return professionals.filter((professional) => {
      const matchesService = !search.service || professional.service === search.service
      const locationValue = search.location.trim().toLowerCase()
      const matchesLocation = !locationValue || professional.location.toLowerCase().includes(locationValue)
      const ratingValue = Number(search.rating)
      const matchesRating = !ratingValue || professional.rating >= ratingValue
      const minimumExperience = Number(search.experience)
      const matchesExperience = !minimumExperience || professional.experienceYears >= minimumExperience
      const tagValue = search.tag.trim().toLowerCase()
      const matchesTag = !tagValue || professional.specialties.some((specialty) => specialty.toLowerCase().includes(tagValue))
      return matchesService && matchesLocation && matchesRating && matchesExperience && matchesTag
    })
  }, [professionals, search])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setActionMessage(
      `Found ${filteredProfessionals.length} nearby ${search.service || 'service'} professionals in ${search.location || 'your area'}.`,
    )
  }

  const openProfessionalModal = (professional, mode) => {
    setSelectedProfessional(professional)
    setModalMode(mode)
    setBookingStatus('')
    setBookingConfirmed(false)
    setModalMessages(mode === 'chat' ? [{ role: 'assistant', text: `You are now chatting with ${professional.name}.` }] : [])
    setBookingForm((current) => ({
      ...current,
      name: authUser?.name || '',
      email: authUser?.email || '',
      phone: current.phone,
      preferredDate: '',
      message: `I am interested in booking ${professional.name} for ${professional.service}.`,
    }))
  }

  const closeProfessionalModal = () => {
    setSelectedProfessional(null)
    setModalMode('chat')
    setModalMessages([])
    setBookingStatus('')
    setBookingConfirmed(false)
    setBookingLoading(false)
    setChatLoading(false)
  }

  const handleModalChatSend = async (message) => {
    if (!message.trim() || !selectedProfessional) return
    const userMsg = message.trim()
    setModalMessages((current) => [...current, { role: 'user', text: userMsg }])
    setChatLoading(true)
    try {
      const res = await sendChatMessage(userMsg, authToken)
      const reply = res?.reply || 'No reply.'
      setModalMessages((current) => [...current, { role: 'assistant', text: reply }])
    } catch {
      setModalMessages((current) => [...current, { role: 'assistant', text: 'Unable to send message.' }])
    } finally {
      setChatLoading(false)
    }
  }

  const handleBookingSubmit = async (event) => {
    event.preventDefault()
    if (!selectedProfessional) return
    setBookingLoading(true)
    setBookingStatus('')
    setBookingConfirmed(false)
    try {
      const response = await createBooking({
        professionalId: selectedProfessional.id,
        professionalName: selectedProfessional.name,
        service: selectedProfessional.service,
        userName: bookingForm.name,
        userEmail: bookingForm.email,
        phone: bookingForm.phone,
        preferredDate: bookingForm.preferredDate,
        message: bookingForm.message,
      }, authToken)
      if (response.success) {
        setBookingConfirmed(true)
        setBookingStatus('Booking request sent successfully. The professional will contact you soon.')
        setBookingForm((current) => ({ ...current, message: `I would like to book ${selectedProfessional.name}.` }))
      } else {
        setBookingConfirmed(false)
        setBookingStatus(response.message || 'Booking request failed.')
      }
    } catch (error) {
      setBookingConfirmed(false)
      setBookingStatus(error.message || 'Booking request failed.')
    } finally {
      setBookingLoading(false)
    }
  }

  const handleChatInputSubmit = async (event) => {
    event.preventDefault()
    const message = event.target.elements?.chat?.value || ''
    if (!message.trim()) return
    await handleModalChatSend(message)
    event.target.reset()
  }

  const handleModalTabChange = (mode) => {
    setModalMode(mode)
    setBookingStatus('')
    setBookingConfirmed(false)
  }

  const handleSelectedProfessionalClose = () => {
    closeProfessionalModal()
  }

  const handleBookButton = (professional) => {
    openProfessionalModal(professional, 'book')
  }

  const handleChatButton = (professional) => {
    openProfessionalModal(professional, 'chat')
  }

  const handleBookingFieldChange = (field, value) => {
    setBookingForm((current) => ({ ...current, [field]: value }))
  }

  const handleChatFieldChange = (value) => {
    // Nothing needed here yet
  }

  const handleModalDismiss = () => {
    closeProfessionalModal()
  }

  const handleProfessionalAction = () => {
    if (modalMode === 'chat') {
      // no-op; the form handles sending
    }
  }

  const handleBookingFormSubmit = handleBookingSubmit

  const handleChatFormSubmit = handleChatInputSubmit

  const handleModalKeyDown = (event) => {
    if (event.key === 'Escape') {
      closeProfessionalModal()
    }
  }

  const handleModalOpen = (professional, mode) => {
    openProfessionalModal(professional, mode)
  }

  const handleModalClear = () => {
    setModalMessages([])
  }

  const handleBookingClear = () => {
    setBookingStatus('')
  }

  const handleRequestBooking = () => {
    setModalMode('book')
  }

  const handleRequestChat = () => {
    setModalMode('chat')
  }

  const handleAuthSwitch = () => {
    setAuthMode((current) => (current === 'login' ? 'signup' : 'login'))
  }

  const handleInputChat = (event) => {
    handleChatFieldChange(event.target.value)
  }

  const handleNameChange = (event) => {
    handleBookingFieldChange('name', event.target.value)
  }

  const handleEmailChange = (event) => {
    handleBookingFieldChange('email', event.target.value)
  }

  const handlePhoneChange = (event) => {
    handleBookingFieldChange('phone', event.target.value)
  }

  const handleDateChange = (event) => {
    handleBookingFieldChange('preferredDate', event.target.value)
  }

  const handleMessageChange = (event) => {
    handleBookingFieldChange('message', event.target.value)
  }

  const handleRegistrationSubmit = async (event) => {
    event.preventDefault()
    setRegistrationMessage('')

    try {
      let imageUrl = ''
      if (selectedImage) {
        setIsUploadingImage(true)
        const uploadResponse = await uploadProfessionalImage(selectedImage)
        imageUrl = uploadResponse.imageUrl || ''
      }

      const response = await createProfessional({
        name: professionalForm.name,
        service: professionalForm.service,
        location: professionalForm.location,
        experienceYears: Number(professionalForm.experienceYears) || 1,
        completedJobs: Number(professionalForm.completedJobs) || 0,
        phone: professionalForm.phone,
        description: professionalForm.description,
        imageUrl,
      })

      const newProfessional = response.professional || {
        id: Date.now(),
        name: professionalForm.name,
        service: professionalForm.service,
        location: professionalForm.location,
        experienceYears: Number(professionalForm.experienceYears) || 1,
        completedJobs: Number(professionalForm.completedJobs) || 0,
        rating: 4.8,
        distance: 'Newly joined',
        description: professionalForm.description,
        specialties: ['Verified', 'New profile'],
        imageUrl,
      }

      setProfessionals((current) => [newProfessional, ...current])
      setRegistrationMessage(`Welcome ${professionalForm.name}! Your profile is now live for nearby customers.`)
      setProfessionalForm({
        name: '',
        service: 'Mechanical',
        location: '',
        experienceYears: '',
        completedJobs: '',
        phone: '',
        description: '',
      })
      setSelectedImage(null)
    } catch (error) {
      setRegistrationMessage(error.message || 'Unable to register right now.')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const activeService = serviceCards[activeScene]

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    setAuthMessage('')

    if (authMode === 'signup' && otpStage !== 'verified') {
      try {
        const response = await sendOtp({ email: authForm.email, phone: authForm.phone || '0000000000' })
        if (response.success) {
          setOtpStage('sent')
          setOtpPayload({ email: authForm.email, phone: authForm.phone || '0000000000', code: '' })
          setOtpMessage(`OTP sent to ${authForm.email}. Use code ${response.debugCode} for local verification.`)
        } else {
          setOtpMessage(response.message || 'Unable to send OTP.')
        }
      } catch (error) {
        setOtpMessage(error.message || 'Unable to send OTP.')
      }
      return
    }

    if (authMode === 'signup' && otpStage === 'sent') {
      try {
        const response = await verifyOtp({ email: otpPayload.email, phone: otpPayload.phone, code: otpPayload.code })
        if (response.success) {
          setOtpStage('verified')
          setOtpMessage('OTP verified. Creating your account now...')
          const signupResponse = await signupUser(authForm)
          if (signupResponse.success) {
            setAuthUser(signupResponse.user)
            setAuthToken(signupResponse.token)
            setAuthMessage(signupResponse.message)
            setAuthForm({ name: '', email: '', password: '', role: 'customer', phone: '' })
            setOtpStage('idle')
            setOtpPayload({ email: '', phone: '', code: '' })
          } else {
            setAuthMessage(signupResponse.message || 'Authentication failed.')
          }
        } else {
          setOtpMessage(response.message || 'OTP verification failed.')
        }
      } catch (error) {
        setOtpMessage(error.message || 'OTP verification failed.')
      }
      return
    }

    try {
      const response = authMode === 'signup'
        ? await signupUser(authForm)
        : await loginUser({ email: authForm.email, password: authForm.password })

      if (response.success) {
        setAuthUser(response.user)
        setAuthToken(response.token)
        setAuthMessage(response.message)
        setAuthForm({ name: '', email: '', password: '', role: 'customer', phone: '' })
      } else {
        setAuthMessage(response.message || 'Authentication failed.')
      }
    } catch (error) {
      setAuthMessage(error.message || 'Authentication failed.')
    }
  }

  const handleWorkerProfileSubmit = async (event) => {
    event.preventDefault()
    if (!authToken) return

    try {
      const response = await updateProfessionalProfile({
        bio: workerProfile.bio,
        availability: workerProfile.availability,
        rate: workerProfile.rate,
      }, authToken)

      if (response.success) {
        setWorkerProfileMessage('Your worker profile was updated.')
      } else {
        setWorkerProfileMessage(response.message || 'Could not update profile.')
      }
    } catch (error) {
      setWorkerProfileMessage(error.message || 'Could not update profile.')
    }
  }

  const handleLogout = () => {
    setAuthUser(null)
    setAuthToken('')
    setDashboardData(null)
    setAuthMessage('You have been logged out.')
  }

  const handleDashboardRefresh = async () => {
    if (!authToken) return
    try {
      const response = await fetchDashboardData(authToken)
      if (response.success) {
        setDashboardData(response)
      }
    } catch {
      setDashboardData(null)
    }
  }

  const handleNotificationsRead = async () => {
    if (!authToken) return
    try {
      const response = await markNotificationsRead(authToken)
      if (response.success) {
        await handleDashboardRefresh()
      }
    } catch {
      // Ignore notification read errors
    }
  }

  const handlePayBooking = async (bookingId) => {
    if (!authToken) return
    try {
      const response = await payBooking(bookingId, authToken)
      if (response.success) {
        await handleDashboardRefresh()
      }
    } catch {
      // Ignore payment errors
    }
  }

  const handleReviewSubmit = async (event) => {
    event.preventDefault()
    setReviewMessage('')

    if (!authToken || !reviewForm.professionalId) {
      setReviewMessage('Choose a professional and sign in to leave a review.')
      return
    }

    try {
      const response = await createReview({
        professionalId: reviewForm.professionalId,
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment,
      }, authToken)

      if (response.success) {
        setReviewMessage('Review submitted successfully.')
        setReviewForm({ professionalId: '', rating: '5', comment: '' })
      } else {
        setReviewMessage(response.message || 'Unable to submit review.')
      }
    } catch (error) {
      setReviewMessage(error.message || 'Unable to submit review.')
    }
  }

  const loadReviews = async (professionalId) => {
    if (!professionalId) return
    try {
      const response = await fetchReviews(professionalId)
      if (response.success) {
        setProfessionalReviews((current) => ({ ...current, [professionalId]: response.reviews || [] }))
      }
    } catch {
      setProfessionalReviews((current) => ({ ...current, [professionalId]: [] }))
    }
  }

  useEffect(() => {
    professionals.forEach((professional) => {
      if (!professionalReviews[professional.id]) {
        loadReviews(professional.id)
      }
    })
  }, [professionals, professionalReviews])

  return (
    <main className="site-shell">
      <div className={`site-backdrop ${activeService.accent}`} aria-hidden="true">
        <div className="backdrop-halo" />
        <div className="backdrop-platform" />
        <div className="scene-stage">
          <div className={`scene-visual ${activeService.accent}`} />
        </div>
      </div>
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      <header className="topbar">
        <a className="brand" href="#home">
          ApnaaKaam
        </a>
        <nav className="nav-links">
          <a href="#discover">Find Service</a>
          <a href="#register">Register</a>
          <a href="#how-it-works">How It Works</a>
        </nav>
      </header>

      <section className="hero-section" id="home">
        <div className="hero-copy">
          <p className="eyebrow">Your Problem Solver at Doorstep</p>
          <h1>Fast, trusted local service professionals for every home and business need.</h1>
          <p className="hero-text">
            Customers can search nearby workers by skill, location, experience and rating. Professionals can register and be discovered instantly.
          </p>
          <div className="hero-actions">
            <a className="btn primary" href="#discover">
              Search Now
            </a>
            <a className="btn secondary" href="#register">
              Register as Professional
            </a>
          </div>
        </div>

        <div className="hero-visual liquid-glass" aria-label="3D booking preview">
          <div className="visual-sphere" />
          <div className="visual-card main-card">
            <div className="card-dot" />
            <h3>Live Match</h3>
            <p>Instantly connect with verified experts in your area.</p>
          </div>
          <div className="visual-card floating-card">
            <span className="pill">3D booking</span>
            <strong>98% response</strong>
          </div>
          <div className="visual-meter">
            <span>Trusted</span>
            <div className="meter-bar">
              <div className="meter-fill" />
            </div>
          </div>
        </div>
      </section>

      <section className="feature-strip">
        <article className="feature-tile liquid-glass">
          <div className="feature-icon" />
          <div>
            <h3>Instant discovery</h3>
            <p>See nearby professionals in seconds with smart matching.</p>
          </div>
        </article>
        <article className="feature-tile liquid-glass">
          <div className="feature-icon" />
          <div>
            <h3>Verified talent</h3>
            <p>Ratings, reviews, and completed jobs build instant trust.</p>
          </div>
        </article>
        <article className="feature-tile liquid-glass">
          <div className="feature-icon" />
          <div>
            <h3>Fast booking</h3>
            <p>Book or chat with experts from a premium, modern experience.</p>
          </div>
        </article>
      </section>

      <section className="auth-panel liquid-glass">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Secure access</p>
            <h2>{authUser ? `Welcome back, ${authUser.name}` : 'Login or create your account'}</h2>
          </div>
          <p>Customers and professionals can sign in to keep their account and bookings connected.</p>
        </div>

        <div className="auth-toggle">
          <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
            Login
          </button>
          <button type="button" className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')}>
            Sign up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleAuthSubmit}>
          {authMode === 'signup' ? (
            <label>
              Full name
              <input
                type="text"
                value={authForm.name}
                onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Your name"
                required
              />
            </label>
          ) : null}
          <label>
            Email
            <input
              type="email"
              value={authForm.email}
              onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={authForm.password}
              onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Enter password"
              required
            />
          </label>
          {authMode === 'signup' ? (
            <>
              <label>
                Phone number
                <input
                  type="tel"
                  value={authForm.phone}
                  onChange={(event) => setAuthForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="9876543210"
                  required
                />
              </label>
              <label>
                Account type
                <select
                  value={authForm.role}
                  onChange={(event) => setAuthForm((current) => ({ ...current, role: event.target.value }))}
                >
                  <option value="customer">Customer</option>
                  <option value="professional">Professional</option>
                </select>
              </label>
              {otpStage !== 'idle' ? (
                <label>
                  OTP code
                  <input
                    type="text"
                    value={otpPayload.code}
                    onChange={(event) => setOtpPayload((current) => ({ ...current, code: event.target.value }))}
                    placeholder="Enter 6-digit OTP"
                  />
                </label>
              ) : null}
            </>
          ) : null}
          <div className="auth-actions">
            <button type="submit">{authMode === 'login' ? 'Login' : 'Create account'}</button>
            {authUser ? (
              <button type="button" className="secondary" onClick={handleLogout}>
                Logout
              </button>
            ) : null}
          </div>
        </form>

        {otpMessage ? <p className="auth-message">{otpMessage}</p> : null}
        {authMessage ? <p className="auth-message">{authMessage}</p> : null}
      </section>

      {authUser ? (
        <section className="auth-panel liquid-glass">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Your workspace</p>
              <h2>{authUser.role === 'admin' ? 'Admin dashboard' : 'Customer and worker dashboard'}</h2>
            </div>
            <p>Track bookings, notifications, and keep your profile activity organized in one place.</p>
          </div>

          <div className="dashboard-grid">
            <article className="dashboard-card">
              <div className="dashboard-card-head">
                <h3>Bookings</h3>
                <button type="button" className="secondary" onClick={handleDashboardRefresh}>Refresh</button>
              </div>
              {dashboardData?.bookings?.length ? (
                <ul className="dashboard-list">
                  {dashboardData.bookings.map((booking) => (
                    <li key={booking._id || booking.id}>
                      <strong>{booking.professionalName}</strong>
                      <span>{booking.service} • {booking.status}</span>
                      {booking.paymentStatus !== 'paid' ? (
                        <button type="button" className="small-btn" onClick={() => handlePayBooking(booking._id || booking.id)}>
                          Pay now
                        </button>
                      ) : (
                        <span className="pill-success">Paid</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted-text">No bookings yet. Start by reaching out to a professional.</p>
              )}
            </article>

            <article className="dashboard-card">
              <div className="dashboard-card-head">
                <h3>Notifications</h3>
                <button type="button" className="secondary" onClick={handleNotificationsRead}>Mark all read</button>
              </div>
              {dashboardData?.notifications?.length ? (
                <ul className="dashboard-list">
                  {dashboardData.notifications.map((notification) => (
                    <li key={notification._id || notification.id}>
                      <strong>{notification.message}</strong>
                      <span>{notification.type}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted-text">You are all caught up. New updates will appear here.</p>
              )}
            </article>
          </div>

          <div className="dashboard-grid compact-grid">
            <article className="dashboard-card">
              <h3>Leave a review</h3>
              <form className="review-form" onSubmit={handleReviewSubmit}>
                <select
                  value={reviewForm.professionalId}
                  onChange={(event) => setReviewForm((current) => ({ ...current, professionalId: event.target.value }))}
                >
                  <option value="">Select a professional</option>
                  {professionals.map((professional) => (
                    <option key={professional.id} value={professional.id}>
                      {professional.name}
                    </option>
                  ))}
                </select>
                <select
                  value={reviewForm.rating}
                  onChange={(event) => setReviewForm((current) => ({ ...current, rating: event.target.value }))}
                >
                  <option value="5">5 ★</option>
                  <option value="4">4 ★</option>
                  <option value="3">3 ★</option>
                  <option value="2">2 ★</option>
                  <option value="1">1 ★</option>
                </select>
                <textarea
                  rows="3"
                  value={reviewForm.comment}
                  onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))}
                  placeholder="Share a quick note about the experience"
                />
                <button type="submit">Submit review</button>
              </form>
              {reviewMessage ? <p className="auth-message">{reviewMessage}</p> : null}
            </article>

            <article className="dashboard-card">
              <h3>Role access</h3>
              <p className="muted-text">
                {authUser.role === 'admin'
                  ? 'You can manage platform activity and oversee customer requests from this workspace.'
                  : 'Your account is ready for bookings, reviews, and real-time updates from professionals.'}
              </p>
            </article>
          </div>

          {authUser.role === 'admin' ? (
            <div className="dashboard-grid compact-grid">
              <article className="dashboard-card">
                <h3>Admin overview</h3>
                <p className="muted-text">{dashboardData?.overview?.totalBookings || 0} bookings • {dashboardData?.overview?.totalUsers || 0} users • {dashboardData?.overview?.totalProfessionals || 0} professionals</p>
                <ul className="dashboard-list">
                  {dashboardData?.users?.slice(0, 5).map((user) => (
                    <li key={user._id || user.id}>
                      <strong>{user.name}</strong>
                      <span>{user.email} • {user.role}</span>
                    </li>
                  ))}
                </ul>
              </article>
              <article className="dashboard-card">
                <h3>Recent professionals</h3>
                <ul className="dashboard-list">
                  {dashboardData?.professionals?.slice(0, 5).map((professional) => (
                    <li key={professional._id || professional.id}>
                      <strong>{professional.name}</strong>
                      <span>{professional.service} • {professional.location}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          ) : null}

          {authUser.role === 'professional' ? (
            <div className="dashboard-grid compact-grid">
              <article className="dashboard-card">
                <h3>Worker profile</h3>
                <form className="review-form" onSubmit={handleWorkerProfileSubmit}>
                  <textarea
                    rows="3"
                    value={workerProfile.bio}
                    onChange={(event) => setWorkerProfile((current) => ({ ...current, bio: event.target.value }))}
                    placeholder="Tell customers about your work"
                  />
                  <input
                    type="text"
                    value={workerProfile.availability}
                    onChange={(event) => setWorkerProfile((current) => ({ ...current, availability: event.target.value }))}
                    placeholder="Availability"
                  />
                  <input
                    type="text"
                    value={workerProfile.rate}
                    onChange={(event) => setWorkerProfile((current) => ({ ...current, rate: event.target.value }))}
                    placeholder="Hourly rate"
                  />
                  <button type="submit">Save profile</button>
                </form>
                {workerProfileMessage ? <p className="auth-message">{workerProfileMessage}</p> : null}
              </article>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="search-panel liquid-glass" id="discover">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Find professionals nearby</p>
            <h2>Search by service and location</h2>
          </div>
          <p>Visitors can instantly discover local experts for the exact work they need.</p>
        </div>

        <form className="search-form" onSubmit={handleSearchSubmit}>
          <select
            value={search.service}
            onChange={(event) => setSearch((current) => ({ ...current, service: event.target.value }))}
          >
            <option value="">All services</option>
            {serviceOptions.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={search.location}
            onChange={(event) => setSearch((current) => ({ ...current, location: event.target.value }))}
            placeholder="Enter city or locality"
          />
          <select
            value={search.rating}
            onChange={(event) => setSearch((current) => ({ ...current, rating: event.target.value }))}
          >
            <option value="">Any rating</option>
            <option value="4.5">4.5+</option>
            <option value="4.8">4.8+</option>
            <option value="5">5.0</option>
          </select>
          <input
            type="number"
            value={search.experience}
            onChange={(event) => setSearch((current) => ({ ...current, experience: event.target.value }))}
            placeholder="Min years"
            min="1"
          />
          <input
            type="text"
            value={search.tag}
            onChange={(event) => setSearch((current) => ({ ...current, tag: event.target.value }))}
            placeholder="Skill tag"
          />
          <button type="submit">Search</button>
        </form>

        <p className="search-meta">{actionMessage}</p>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Services</p>
          <h2>Choose from trusted local service categories</h2>
        </div>
        <div className="card-grid">
          {serviceCards.map((card) => (
            <article className={`service-card ${card.accent}`} key={card.title}>
              <div className={`service-visual ${card.accent}`}>
                <span className="visual-core" />
                <span className="visual-ring" />
                <span className="visual-node node-a" />
                <span className="visual-node node-b" />
                <span className="visual-node node-c" />
              </div>
              <h3>{card.title}</h3>
              <p>{serviceList.includes(card.title) ? 'Live from backend API' : 'Reliable professionals available nearby for quick support and booking.'}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="results-section">
        <div className="section-heading">
          <h2>Nearby registered professionals</h2>
          <p>{filteredProfessionals.length} people are currently matching your search.</p>
        </div>

        <div className="card-grid">
          {filteredProfessionals.map((professional) => (
            <article className="info-card liquid-glass" key={professional.id}>
              <div className="card-top">
                <div>
                  <h3>{professional.name}</h3>
                  <p className="service-pill">{professional.service}</p>
                </div>
                <span className="rating-badge">⭐ {professional.rating}</span>
              </div>
              <p className="card-location">{professional.location} • {professional.distance}</p>
              <p className="card-description">{professional.description}</p>
              <div className="mini-stats">
                <span>{professional.experienceYears} years exp</span>
                <span>{professional.completedJobs} jobs done</span>
              </div>
              <div className="tag-row">
                {professional.specialties.map((specialty) => (
                  <span key={specialty}>{specialty}</span>
                ))}
              </div>
              <div className="review-stack">
                {(professionalReviews[professional.id] || []).slice(0, 2).map((review) => (
                  <div key={review._id || review.id} className="review-bubble">
                    <strong>{review.userName || 'Customer'}</strong>
                    <span>{review.rating}★</span>
                    <p>{review.comment}</p>
                  </div>
                ))}
              </div>
              <div className="card-actions">
                <button type="button" onClick={() => handleChatButton(professional)}>
                Chat
              </button>
              <button type="button" className="primary" onClick={() => handleBookButton(professional)}>
                Book now
              </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="how-it-works">
        <div className="section-heading">
          <p className="eyebrow">How it works</p>
          <h2>A simple flow for customers and professionals</h2>
        </div>
        <div className="card-grid steps-grid">
          <article className="info-card liquid-glass">
            <h3>1. Search</h3>
            <p>Select the service and location to view nearby professionals instantly.</p>
          </article>
          <article className="info-card liquid-glass">
            <h3>2. Compare</h3>
            <p>Review experience, completed work, ratings, and a short profile description.</p>
          </article>
          <article className="info-card liquid-glass">
            <h3>3. Connect</h3>
            <p>Use chat or book now to reach the professional directly from the website.</p>
          </article>
        </div>
      </section>

      <section className="register-section liquid-glass" id="register">
        <div className="section-heading">
          <p className="eyebrow">Register your service</p>
          <h2>Join as a professional and get discovered by customers</h2>
        </div>

        <div className="register-grid">
          <form className="contact-form" onSubmit={handleRegistrationSubmit}>
            <label>
              Full name
              <input
                type="text"
                value={professionalForm.name}
                onChange={(event) => setProfessionalForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Your name"
                required
              />
            </label>
            <label>
              Service type
              <select
                value={professionalForm.service}
                onChange={(event) => setProfessionalForm((current) => ({ ...current, service: event.target.value }))}
              >
                {serviceOptions.map((service) => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
            </label>
            <label>
              Location
              <input
                type="text"
                value={professionalForm.location}
                onChange={(event) => setProfessionalForm((current) => ({ ...current, location: event.target.value }))}
                placeholder="City or locality"
                required
              />
            </label>
            <label>
              Experience in years
              <input
                type="number"
                value={professionalForm.experienceYears}
                onChange={(event) => setProfessionalForm((current) => ({ ...current, experienceYears: event.target.value }))}
                placeholder="5"
                required
              />
            </label>
            <label>
              Jobs completed
              <input
                type="number"
                value={professionalForm.completedJobs}
                onChange={(event) => setProfessionalForm((current) => ({ ...current, completedJobs: event.target.value }))}
                placeholder="120"
                required
              />
            </label>
            <label>
              Phone number
              <input
                type="tel"
                value={professionalForm.phone}
                onChange={(event) => setProfessionalForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="9876543210"
                required
              />
            </label>
            <label>
              Short description
              <textarea
                rows="4"
                value={professionalForm.description}
                onChange={(event) => setProfessionalForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Describe your work and experience"
                required
              />
            </label>
            <label>
              Profile photo
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setSelectedImage(event.target.files?.[0] || null)}
              />
            </label>
            <button type="submit" disabled={isUploadingImage}>
              {isUploadingImage ? 'Uploading image...' : 'Register profile'}
            </button>
          </form>

          <div className="register-info">
            <h3>Why professionals use ApnaaKaam</h3>
            <ul>
              <li>Show your experience and job count</li>
              <li>Get discovered by local customers</li>
              <li>Receive bookings and chat requests</li>
              <li>Build trust with ratings and reviews</li>
            </ul>
            {registrationMessage ? <p className="success-box">{registrationMessage}</p> : null}
          </div>
        </div>
      </section>

      <Chat token={authToken} />

      <footer className="footer">
        <p>© 2026 ApnaaKaam. Built for local service discovery.</p>
      </footer>

      <a className="floating-cta" href="#register">
        Need help? Book now
      </a>

      {selectedProfessional ? (
        <div className="modal-backdrop" onClick={handleModalDismiss}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{selectedProfessional.name}</h3>
                <p className="service-pill">{selectedProfessional.service}</p>
                <p className="modal-description">{selectedProfessional.description}</p>
              </div>
              <button type="button" className="modal-close" onClick={handleModalDismiss}>
                Close
              </button>
            </div>

            <div className="mini-stats">
              <span>{selectedProfessional.experienceYears} years exp</span>
              <span>{selectedProfessional.completedJobs} jobs done</span>
              <span>{selectedProfessional.location}</span>
            </div>

            <div className="modal-tabs">
              <button type="button" className={modalMode === 'chat' ? 'active' : ''} onClick={() => handleModalTabChange('chat')}>
                Chat
              </button>
              <button type="button" className={modalMode === 'book' ? 'active' : ''} onClick={() => handleModalTabChange('book')}>
                Book
              </button>
            </div>

            {modalMode === 'chat' ? (
              <section className="modal-body">
                <div className="chat-messages modal-messages">
                  {modalMessages.map((message, index) => (
                    <div key={index} className={`chat-msg ${message.role}`}>
                      <div className="chat-text">{message.text}</div>
                    </div>
                  ))}
                </div>
                <form className="chat-input-row" onSubmit={handleChatInputSubmit}>
                  <input
                    name="chat"
                    type="text"
                    placeholder="Send a message..."
                    autoComplete="off"
                    disabled={chatLoading}
                  />
                  <button type="submit" disabled={chatLoading}>
                    {chatLoading ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </section>
            ) : (
              <section className="modal-body">
                <form className="booking-form" onSubmit={handleBookingSubmit}>
                  <label>
                    Name
                    <input
                      type="text"
                      value={bookingForm.name}
                      onChange={handleNameChange}
                      placeholder="Your name"
                      required
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={bookingForm.email}
                      onChange={handleEmailChange}
                      placeholder="you@example.com"
                      required
                    />
                  </label>
                  <label>
                    Phone
                    <input
                      type="tel"
                      value={bookingForm.phone}
                      onChange={handlePhoneChange}
                      placeholder="9876543210"
                      required
                    />
                  </label>
                  <label>
                    Preferred date
                    <input
                      type="date"
                      value={bookingForm.preferredDate}
                      onChange={handleDateChange}
                      required
                    />
                  </label>
                  <label>
                    Message
                    <textarea
                      rows="4"
                      value={bookingForm.message}
                      onChange={handleMessageChange}
                      placeholder="Any details for your booking request"
                      required
                    />
                  </label>
                  <button type="submit" className="primary" disabled={bookingLoading}>
                    {bookingLoading ? 'Sending request...' : 'Send booking request'}
                  </button>
                </form>
                {bookingConfirmed ? (
                  <div className="booking-success-card">
                    <div className="booking-success-icon">✓</div>
                    <div>
                      <strong>Request received</strong>
                      <p>The professional will reach out soon with the next steps.</p>
                    </div>
                  </div>
                ) : null}
                {bookingStatus ? <p className={`status-note ${bookingConfirmed ? 'success' : ''}`}>{bookingStatus}</p> : null}
              </section>
            )}
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default App
