const url = 'http://localhost:5000/api'

async function runTests() {
  try {
    const healthRes = await fetch(`${url}/health`)
    console.log('HEALTH_OK', await healthRes.json())

    const chatRes = await fetch(`${url}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
    })
    console.log('CHAT_OK', await chatRes.json())

    const bookingRes = await fetch(`${url}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        professionalId: 1,
        professionalName: 'Test',
        service: 'Plumbing',
        userName: 'Test User',
        userEmail: 'test@example.com',
        phone: '9998887777',
        preferredDate: '2026-07-01',
        message: 'Test booking',
      }),
    })
    console.log('BOOKING_OK', await bookingRes.json())
  } catch (err) {
    console.error('ERROR', err)
    process.exit(1)
  }
}

runTests()
