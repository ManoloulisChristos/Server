const mongoose = require('mongoose');

const PasswordResetShema = new mongoose.Schema({
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
    expires: 30 * 60, //in seconds > 30 min
  },
  count: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model('Password_Reset', PasswordResetShema);
