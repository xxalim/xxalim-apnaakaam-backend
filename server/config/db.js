import mongoose from "mongoose";

export async function connectDB(seedProfessionals) {
  let databaseReady = false;
  let useMemoryStore = false;

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: true,
    });

    databaseReady = true;
    useMemoryStore = false;

    console.log("✅ MongoDB connected successfully.");

    await seedProfessionals();

  } catch (error) {
    console.warn(
      "⚠️ MongoDB unavailable, using in-memory storage.",
      error.message
    );

    useMemoryStore = true;
  }

  return {
    databaseReady,
    useMemoryStore,
  };
}
