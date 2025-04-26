import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  progress: {
    conceptsLearned: [{ type: String }],
    lecturesAttended: Number,
    teachModeScore: Number,
  },
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model("User", userSchema);
