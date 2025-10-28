const mongoose = require('mongoose');

const CommentsShema = mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required.'],
  },
  text: {
    type: String,
    required: [true, 'Provide text.'],
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  movieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Comment', CommentsShema, 'comments');
