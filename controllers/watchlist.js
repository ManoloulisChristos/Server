const mongoose = require('mongoose');
const {
  UnauthorizedError,
  BadRequestError,
  UnprocessableEntityError,
} = require('../errors');
const User = require('../models/User');

// GET /user/:id/watchlist
const getWatchlist = async (req, res) => {
  const { id } = req.params;

  const watchlist = await User.findById(id, 'watchlist -_id').lean().exec();
  return res.status(200).json(watchlist.watchlist);
};

// GET /user/:id/watchlist/populated
const getPopulatedWatchlist = async (req, res) => {
  const { id } = req.params;

  // Find the correct user, unwind the watchlist array then sort them and populate
  // them with each ones corresponding movie and group them back together.

  const { sortBy, sort } = req.query;

  const sortByAcceptedValues = ['A-Z', 'Rating', 'Date'];
  if (!sortBy || !sortByAcceptedValues.includes(sortBy)) {
    throw new BadRequestError(undefined, 'Invalid sortBy query option');
  }

  if (!sort || (sort !== '1' && sort !== '-1')) {
    throw new BadRequestError(undefined, 'Invalid sort query option');
  }

  let sortField = null;

  if (sortBy === 'A-Z') {
    sortField = 'movieDetails.title';
  } else if (sortBy === 'Rating') {
    sortField = 'movieDetails.imdb';
  } else {
    sortField = 'watchlist.createdAt';
  }

  const [result] = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    { $unwind: '$watchlist' },
    {
      $lookup: {
        from: 'movies',
        localField: 'watchlist.movieId',
        foreignField: '_id',
        pipeline: [
          { $project: { _id: 0, title: 1, poster: 1, imdb: '$imdb.rating' } },
        ],
        as: 'movieDetails',
      },
    },
    { $sort: { [sortField]: Number(sort) } },
    {
      $facet: {
        totalCount: [
          {
            $count: 'count',
          },
        ],
        docs: [
          {
            $replaceWith: {
              $mergeObjects: [
                { $arrayElemAt: ['$movieDetails', 0] },
                '$watchlist',
              ],
            },
          },
        ],
      },
    },
    {
      $project: {
        count: { $arrayElemAt: ['$totalCount.count', 0] },
        docs: 1,
      },
    },
  ]);

  return res.status(200).json(result);
};

// POST /user/:id/watchlist

const addToWatchlist = async (req, res) => {
  const { id } = req.params;
  const { movieId } = req.body;

  if (id !== req.userId) {
    throw new UnauthorizedError(undefined, 'Credentials are wrong.');
  }

  const result = await User.updateOne(
    { _id: id },
    { $push: { watchlist: { movieId } } }
  );

  if (result.modifiedCount === 0) {
    throw new UnprocessableEntityError(
      undefined,
      'No document found, try again.'
    );
  }

  return res.status(200).json({ message: 'Added to watchlist' });
};

// DELETE /user/:id/watchlist

const deleteFromWatchlist = async (req, res) => {
  const { id } = req.params;
  const { movieId } = req.body;

  if (id !== req.userId) {
    throw new UnauthorizedError(undefined, 'Credentials are wrong.');
  }

  const result = await User.updateOne(
    { _id: id },
    { $pull: { watchlist: { movieId } } }
  );

  if (result.modifiedCount === 0) {
    throw new UnprocessableEntityError(
      undefined,
      'No document found, try again.'
    );
  }

  return res.status(200).json({ message: 'Removed from watchlist' });
};

module.exports = {
  getWatchlist,
  getPopulatedWatchlist,
  addToWatchlist,
  deleteFromWatchlist,
};
