import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { dirname } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

let serverProcess
const serverDir = dirname(fileURLToPath(import.meta.url))
const port = 5051
const apiBase = `http://127.0.0.1:${port}/api`

async function waitForServer() {
  for (let i = 0; i < 30; i += 1) {
    try {
      const response = await fetch(`${apiBase}/health`)
      if (response.ok) return
    } catch {
      // keep waiting
    }
    await delay(200)
  }

  throw new Error('Server did not start in time')
}

test('booking status can be updated', async (t) => {
  serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: serverDir,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  t.after(async () => {
    serverProcess?.kill('SIGTERM')
    await delay(500)
  })

  await waitForServer()

  const createResponse = await fetch(`${apiBase}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      professionalId: 99,
      professionalName: 'Test Worker',
      service: 'Plumber',
      userName: 'Test User',
      userEmail: 'test@example.com',
      phone: '9876543210',
      preferredDate: '2026-07-10',
      message: 'Need a test booking',
    }),
  })

  const created = await createResponse.json()
  assert.equal(createResponse.status, 201)
  assert.equal(created.success, true)

  const updateResponse = await fetch(`${apiBase}/bookings/${created.booking.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'approved' }),
  })

  const updated = await updateResponse.json()
  assert.equal(updateResponse.status, 200)
  assert.equal(updated.success, true)
  assert.equal(updated.booking.status, 'approved')
})
