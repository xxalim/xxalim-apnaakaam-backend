import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Professional",
    },
    userId: String,
    userName: String,
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
  },
  { timestamps: true }
);

export default mongoose.models.Review ||
  mongoose.model("Review", reviewSchema);
  