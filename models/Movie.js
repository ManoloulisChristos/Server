const mongoose = require('mongoose');

// Select predefined collection
module.exports = mongoose.model('Movie', new mongoose.Schema({}), 'movies');
