const User = require('../models/User');
const {
  UnauthorizedError,
  CustomError,
  BadRequestError,
  UnprocessableEntityError,
} = require('../errors');
const mongoose = require('mongoose');

// GET /user/:id/rating
const getRatings = async (req, res) => {
  const { id } = req.params;

  const result = await User.findById(id, 'ratings -_id').lean().exec();

  return res.status(200).json(result.ratings);
};

const getPopulatedRatings = async (req, res) => {
  const { id } = req.params;

  // Find the correct user, unwind the ratings array then sort them and populate
  // them with each ones corresponding movie and group them back together.

  const { sortBy, sort } = req.query;

  const sortByAcceptedValues = ['A-Z', 'Rating', 'Date'];
  if (!sortBy || !sortByAcceptedValues.includes(sortBy)) {
    throw new BadRequestError('Invalid sortBy query option');
  }

  if (!sort || (sort !== '1' && sort !== '-1')) {
    throw new BadRequestError('Invalid sort query option');
  }

  let sortField = null;

  if (sortBy === 'A-Z') {
    sortField = 'movieDetails.title';
  } else if (sortBy === 'Rating') {
    sortField = 'ratings.rating';
  } else {
    sortField = 'ratings.createdAt';
  }

  const [result] = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    { $unwind: '$ratings' },
    {
      $lookup: {
        from: 'movies',
        localField: 'ratings.movieId',
        foreignField: '_id',
        pipeline: [{ $project: { title: 1, poster: 1, _id: 0 } }],
        as: 'movieDetails',
      },
    },
    { $sort: { [sortField]: Number(sort) } },
    {
      $facet: {
        totalCount: [{ $count: 'count' }],
        docs: [
          {
            $replaceWith: {
              $mergeObjects: [
                { $arrayElemAt: ['$movieDetails', 0] },
                '$ratings',
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

// POST /user/:id/rating

// Adds new rating and returns the value
const addRating = async (req, res) => {
  const { id } = req.params;
  const { rating, movieId } = req.body;

  if (id !== req.userId) {
    throw new UnauthorizedError(undefined, 'Credentials are wrong');
  }
  const result = await User.updateOne(
    { _id: id },
    { $push: { ratings: { rating, movieId } } }
  );

  if (result.modifiedCount === 0) {
    throw new UnprocessableEntityError(
      undefined,
      'No document found, try again.'
    );
  }

  return res.status(200).json({ message: 'Rating added.' });
};

// PATCH /user/:id/rating
const updateRating = async (req, res) => {
  const { id } = req.params;
  const { rating, movieId } = req.body;

  if (id !== req.userId) {
    throw new UnauthorizedError(undefined, 'Credentials are wrong');
  }

  const result = await User.updateOne(
    { _id: id, 'ratings.movieId': movieId },
    {
      $set: { 'ratings.$.rating': rating },
    }
  );

  if (result.modifiedCount === 0) {
    throw new UnprocessableEntityError(
      undefined,
      'No document found, try again.'
    );
  }

  return res.status(200).json({ message: 'Rating updated.' });
};

// DELETE /user/:id/rating
const deleteRating = async (req, res) => {
  const { id } = req.params;
  const { movieId } = req.body;

  console.log(id, req.userId);
  if (id !== req.userId) {
    throw new UnauthorizedError(undefined, 'Credentials are wrong');
  }

  const result = await User.updateOne(
    { _id: id, 'ratings.movieId': movieId },
    { $pull: { ratings: { movieId } } }
  );

  if (result.modifiedCount === 0) {
    throw new UnprocessableEntityError(
      undefined,
      'No document found, try again.'
    );
  }
  return res.status(200).json({ message: 'Rating deleted.' });
};

module.exports = {
  getRatings,
  getPopulatedRatings,
  addRating,
  updateRating,
  deleteRating,
};
