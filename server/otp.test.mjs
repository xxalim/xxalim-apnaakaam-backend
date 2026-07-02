import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { dirname } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

let serverProcess
const serverDir = dirname(fileURLToPath(import.meta.url))
const port = 5052
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

test('OTP send and verify flow works', async (t) => {
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

  const sendResponse = await fetch(`${apiBase}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'otp@example.com', phone: '9876543210' }),
  })

  const sendData = await sendResponse.json()
  assert.equal(sendResponse.status, 200)
  assert.equal(sendData.success, true)
  assert.equal(typeof sendData.debugCode, 'string')

  const verifyResponse = await fetch(`${apiBase}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'otp@example.com', phone: '9876543210', code: sendData.debugCode }),
  })

  const verifyData = await verifyResponse.json()
  assert.equal(verifyResponse.status, 200)
  assert.equal(verifyData.success, true)
  assert.equal(verifyData.verified, true)
})
