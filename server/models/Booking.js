import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    professionalId: mongoose.Schema.Types.Mixed,
    professionalName: String,
    service: String,
    userName: String,
    userEmail: String,
    phone: String,
    preferredDate: String,
    message: String,
    status: { type: String, default: "pending" },
    paymentStatus: { type: String, default: "pending" },
    adminNote: String,
    scheduledDate: String,
    userId: String,
  },
  { timestamps: true }
);

export default mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);
  