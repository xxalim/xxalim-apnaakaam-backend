import User from "../models/User.js";
import { hashPassword, verifyPassword } from "../utils/hash.js";
import { signToken } from "../utils/jwt.js";

export async function registerUser({ name, email, password, role = "customer" }) {
  const existingUser = await User.findOne({
    email: { $regex: `^${email}$`, $options: "i" },
  });

  if (existingUser) {
    throw new Error("An account with this email already exists.");
  }

  const user = await User.create({
    name,
    email,
    password: hashPassword(password),
    role,
  });

  const token = signToken(user);

  return {
    token,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({
    email: { $regex: `^${email}$`, $options: "i" },
  });

  if (!user || !verifyPassword(password, user.password)) {
    throw new Error("Invalid email or password.");
  }

  const token = signToken(user);

  return {
    token,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}