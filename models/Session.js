const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  hashedToken: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isValid: {
    type: Boolean,
    default: true,
  },
  persist: {
    type: Boolean,
    required: true,
  },
  createdAt: {
    type: Date,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

module.exports = mongoose.model('Session', SessionSchema);
