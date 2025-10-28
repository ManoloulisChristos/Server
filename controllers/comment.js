const {
  ConflictError,
  CustomError,
  UnauthorizedError,
  BadRequestError,
  UnprocessableEntityError,
} = require('../errors');
const Comment = require('../models/Comment');
const mongoose = require('mongoose');

//GET /comment/user/:id
const getUserComments = async (req, res) => {
  const { id: userId } = req.params;

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
    sortField = 'title';
  } else if (sortBy === 'Rating') {
    sortField = 'imdb';
  } else {
    sortField = 'date';
  }

  const [result] = await Comment.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: 'movies',
        localField: 'movieId',
        foreignField: '_id',
        pipeline: [
          { $project: { _id: 0, title: 1, poster: 1, imdb: '$imdb.rating' } },
        ],
        as: 'movieDetails',
      },
    },
    {
      $facet: {
        docs: [
          {
            $replaceWith: {
              $mergeObjects: ['$$ROOT', { $arrayElemAt: ['$movieDetails', 0] }],
            },
          },
          { $sort: { [sortField]: Number(sort) } },
          {
            $project: {
              movieDetails: 0,
            },
          },
        ],
        count: [{ $count: 'count' }],
      },
    },
    {
      $project: {
        docs: 1,
        count: { $arrayElemAt: ['$count.count', 0] },
      },
    },
  ]);

  return res.status(200).json(result);
};

// GET /comment/:id
const getComments = async (req, res) => {
  const { id } = req.params;
  const { page, userId } = req.query; // If userId is missing i get an empty array in the response which is intentional
  const skipVal = Number(page) * 8 - 8;

  if (!page) {
    throw new BadRequestError(undefined, 'Page field is missing.');
  }

  const [result] = await Comment.aggregate([
    {
      $match: {
        $or: [
          { movie_id: new mongoose.Types.ObjectId(id) },
          { movieId: new mongoose.Types.ObjectId(id) },
        ],
      },
    },
    {
      $facet: {
        docs: [{ $skip: skipVal }, { $limit: 8 }, { $sort: { date: -1 } }],
        userComment: [
          {
            $match: {
              userId: new mongoose.Types.ObjectId(userId),
            },
          },
        ],
        count: [{ $count: 'count' }],
      },
    },
    {
      $project: {
        count: { $arrayElemAt: ['$count.count', 0] },
        docs: 1,
        userComment: 1,
      },
    },
  ]);

  return res.status(200).json(result);
};

// POST /comment
const addComment = async (req, res) => {
  const { userId, name, text, movieId } = req.body;

  const exists = await Comment.find({ userId, movieId });

  if (exists.length) {
    throw new ConflictError(
      undefined,
      'Only one comment per movie is permitted.'
    );
  }

  const result = await Comment.create({
    movieId,
    userId,
    name,
    text,
  });

  return res.status(201).json({ message: 'Comment added.' });
};

// PATCH /comment
const updateComment = async (req, res) => {
  const { id, text } = req.body;

  const result = await Comment.updateOne({ _id: id }, { $set: { text } });
  if (result.modifiedCount === 0) {
    throw new UnprocessableEntityError(
      undefined,
      'No document found, try again.'
    );
  }

  return res.status(200).json({ message: 'Comment updated.' });
};

// DELETE /comment
const deleteComment = async (req, res) => {
  const { id } = req.body;

  const result = await Comment.deleteOne({
    _id: id,
  });
  if (result.deletedCount === 0) {
    throw new UnprocessableEntityError(
      undefined,
      'No document found, try again.'
    );
  }

  return res.status(200).json({ message: 'Comment deleted.' });
};

module.exports = {
  getUserComments,
  getComments,
  addComment,
  updateComment,
  deleteComment,
};
