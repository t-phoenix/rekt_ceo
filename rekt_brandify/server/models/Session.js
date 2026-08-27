import mongoose from 'mongoose';

const CuratedChoiceSchema = new mongoose.Schema({
  element: { type: String, required: true },
  idea: { type: String, required: true },
  isCustom: { type: Boolean, default: false }
});

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  timestamp: { type: Date, default: Date.now },
  
  originalImageUrl: { type: String, required: true },
  generatedImageUrl: { type: String, default: null },
  
  userCustomTarget: { type: String, default: null },
  aiVisionRaw: { type: Object, default: null },
  
  userCuratedChoices: [CuratedChoiceSchema],
  compiledPrompt: { type: String, default: null },
  
  engineUsed: { type: String, default: null },
  jobId: { type: String, default: null },
  
  userRating: { 
    type: String, 
    enum: ['Like', 'Dislike', 'Neutral', null], 
    default: null 
  },
  
  error: { type: String, default: null }
});

export default mongoose.model('Session', SessionSchema);
