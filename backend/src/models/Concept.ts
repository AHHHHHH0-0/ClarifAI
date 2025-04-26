import mongoose from "mongoose";

const conceptSchema = new mongoose.Schema({
  term: { type: String, required: true },
  explanation: { type: String, required: true },
  context: String,
  difficulty: { type: Number, min: 1, max: 5 },
  relatedConcepts: [{ type: String }],
  timestamp: { type: Date, default: Date.now },
});

export const Concept = mongoose.model("Concept", conceptSchema);
