const express = require('express');
const router = express.Router();
const invalidMethodMiddleware = require('../middleware/invalidMethod');
const {
  getUser,
  updateUsername,
  updatePassword,
  deleteAccount,
} = require('../controllers/user');

const {
  addRating,
  updateRating,
  deleteRating,
  getRatings,
  getPopulatedRatings,
} = require('../controllers/rating');
const {
  addToWatchlist,
  deleteFromWatchlist,
  getWatchlist,
  getPopulatedWatchlist,
} = require('../controllers/watchlist');

const allowedMethods = {
  '/[^/]+/settings': ['GET'],
  '/[^/]+/settings/username': ['PATCH'],
  '/[^/]+/settings/password': ['PATCH'],
  '/[^/]+/settings/delete': ['DELETE'],
  '/[^/]+/rating': ['GET', 'POST', 'PATCH', 'DELETE'],
  '/[^/]+/rating/populated': ['GET'],
  '/[^/]+/watchlist': ['GET', 'POST', 'DELETE'],
  '/[^/]+/watchlist/populated': ['GET'],
};

// User settings
router.route('/:id/settings').get(getUser);
router.route('/:id/settings/username').patch(updateUsername);
router.route('/:id/settings/password').patch(updatePassword);
router.route('/:id/settings/delete').delete(deleteAccount);

// Ratings
router
  .route('/:id/rating')
  .get(getRatings)
  .post(addRating)
  .patch(updateRating)
  .delete(deleteRating);

router.route('/:id/rating/populated').get(getPopulatedRatings);

// Watchlist
router
  .route('/:id/watchlist')
  .get(getWatchlist)
  .post(addToWatchlist)
  .delete(deleteFromWatchlist);

router.route('/:id/watchlist/populated').get(getPopulatedWatchlist);

// Not allowed methods
router.use(invalidMethodMiddleware(allowedMethods));

module.exports = router;
