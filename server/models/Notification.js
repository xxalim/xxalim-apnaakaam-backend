import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: String,
    message: String,
    type: { type: String, default: "info" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);