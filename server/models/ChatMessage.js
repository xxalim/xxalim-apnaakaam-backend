import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    bookingId: String,
    senderId: String,
    senderName: String,
    senderRole: String,
    message: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.ChatMessage ||
  mongoose.model("ChatMessage", chatMessageSchema);