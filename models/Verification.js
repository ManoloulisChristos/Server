const mongoose = require('mongoose');

const VerificationSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 24 * 3600, //in seconds > 24h
  },
});

module.exports = mongoose.model('Verification', VerificationSchema);
