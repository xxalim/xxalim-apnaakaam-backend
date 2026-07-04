import { verifyToken } from "../utils/jwt.js";
import {
  registerUser,
  loginUser,
} from "../services/authService.js";
import { sendJson } from "../utils/sendJson.js";
import { memoryOtpCodes } from "../store/memoryStore.js";

export async function signup(req, res) {
  try {
    const { name, email, password, role = "customer" } = req.body;

    if (!name || !email || !password) {
      return sendJson(res, 400, {
        success: false,
        message: "Please fill in all required fields.",
      });
    }

    const result = await registerUser({
      name,
      email,
      password,
      role,
    });

    return sendJson(res, 201, {
      success: true,
      message: "Account created successfully.",
      ...result,
    });
  } catch (err) {
    return sendJson(res, 400, {
      success: false,
      message: err.message,
    });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendJson(res, 400, {
        success: false,
        message: "Email and password are required.",
      });
    }

    const result = await loginUser({
      email,
      password,
    });

    return sendJson(res, 200, {
      success: true,
      message: "Login successful.",
      ...result,
    });
  } catch (err) {
    return sendJson(res, 401, {
      success: false,
      message: err.message,
    });
  }
}

export async function sendOtp(req, res) {
  try {
    const { email, phone } = req.body;

    if (!email || !phone) {
      return sendJson(res, 400, {
        success: false,
        message: "Email and phone are required.",
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    memoryOtpCodes.set(`${email}:${phone}`, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    return sendJson(res, 200, {
      success: true,
      message: "OTP sent successfully.",
      debugCode: code,
    });
  } catch (err) {
    return sendJson(res, 500, {
      success: false,
      message: err.message,
    });
  }
}

export async function verifyOtp(req, res) {
  try {
    const { email, phone, code } = req.body;

    const stored = memoryOtpCodes.get(`${email}:${phone}`);

    if (!stored) {
      return sendJson(res, 400, {
        success: false,
        message: "No OTP found.",
      });
    }

    if (stored.code !== code) {
      return sendJson(res, 400, {
        success: false,
        message: "Invalid OTP.",
      });
    }

    if (Date.now() > stored.expiresAt) {
      memoryOtpCodes.delete(`${email}:${phone}`);

      return sendJson(res, 400, {
        success: false,
        message: "OTP expired.",
      });
    }

    memoryOtpCodes.delete(`${email}:${phone}`);

    return sendJson(res, 200, {
      success: true,
      verified: true,
    });
  } catch (err) {
    return sendJson(res, 500, {
      success: false,
      message: err.message,
    });
  }
}

export async function me(req, res) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return sendJson(res, 401, {
        success: false,
        message: "Not authenticated.",
      });
    }

    const user = verifyToken(token);

    return sendJson(res, 200, {
      success: true,
      user,
    });
  } catch {
    return sendJson(res, 401, {
      success: false,
      message: "Invalid token.",
    });
  }
}