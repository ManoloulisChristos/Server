const express = require('express');
const router = express.Router();

const {
  autocomplete,
  getMovieWithID,
  getMoviesWithTitle,
  moreLikeThis,
  advancedSearch,
  getTopMovies,
} = require('../controllers/search');
const invalidMethodMiddleware = require('../middleware/invalidMethod');

const allowedMethods = {
  '/': ['GET'],
  '/id/[^/]+': ['GET'],
  '/title/[^/]+': ['GET'],
  '/more-like-this': ['POST'],
  '/advanced': ['GET'],
  '/top100': ['GET'],
};

router.route('/').get(autocomplete);
router.route('/id/:id').get(getMovieWithID);
router.route('/title/:title').get(getMoviesWithTitle);
router.route('/more-like-this').post(moreLikeThis);
router.route('/advanced').get(advancedSearch);
router.route('/top100').get(getTopMovies);

// Not allowed methods
router.use(invalidMethodMiddleware(allowedMethods));

module.exports = router;
