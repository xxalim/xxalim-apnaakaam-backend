import mongoose from "mongoose";

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
    distance: { type: String, default: "Newly joined" },
    specialties: { type: [String], default: ["Verified"] },
    imageUrl: String,
    ownerUserId: String,
    bio: String,
    availability: String,
    rate: String,
  },
  { timestamps: true }
);

export default mongoose.models.Professional ||
  mongoose.model("Professional", professionalSchema);
  