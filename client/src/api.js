const API_BASE_URLS = [
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  'http://localhost:5001/api',
]

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    searchParams.set(key, String(value))
  })

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

async function requestJson(path, options = {}) {
  let lastError = null

  for (const baseUrl of API_BASE_URLS) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        ...options,
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || 'Request failed')
      }

      return data
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('Request failed')
}

export async function fetchHealth() {
  return requestJson('/health')
}

export async function fetchServices() {
  return requestJson('/services')
}

export async function fetchProfessionals(params = {}) {
  return requestJson(`/professionals${buildQueryString(params)}`)
}

export async function createProfessional(payload) {
  return requestJson('/professionals', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function uploadProfessionalImage(file) {
  const formData = new FormData()
  formData.append('image', file)

  const response = await fetch(`${API_BASE_URLS[0]}/upload/image`, {
    method: 'POST',
    body: formData,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || 'Upload failed')
  }

  return data
}

export async function signupUser(payload) {
  return requestJson('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function loginUser(payload) {
  return requestJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function sendOtp(payload) {
  return requestJson('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function verifyOtp(payload) {
  return requestJson('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getCurrentUser(token) {
  return requestJson('/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function createBooking(payload, token) {
  return requestJson('/bookings', {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })
}

export async function fetchDashboardData(token) {
  return requestJson('/dashboard', {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

export async function fetchNotifications(token) {
  return requestJson('/notifications', {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

export async function markNotificationsRead(token) {
  return requestJson('/notifications/read', {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

export async function createReview(payload, token) {
  return requestJson('/reviews', {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })
}

export async function fetchReviews(professionalId) {
  return requestJson(`/reviews/${professionalId}`)
}

export async function updateProfessionalProfile(payload, token) {
  return requestJson('/professionals/profile', {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })
}

export async function payBooking(bookingId, token) {
  return requestJson(`/bookings/${bookingId}/pay`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

export async function sendChatMessage(message, token) {
  return requestJson('/chat', {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message }),
  })
}
