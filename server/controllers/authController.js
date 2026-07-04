export async function signup(req, res) {
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
}
