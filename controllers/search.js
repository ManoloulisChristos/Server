const Movie = require('../models/Movie');
const {
  BadRequestError,
  UnprocessableEntityError,
  NotFoundError,
} = require('../errors');
const util = require('util');
const { equal } = require('assert');
const { default: mongoose } = require('mongoose');
const { text, query } = require('express');
const path = require('path');

const autocomplete = async (req, res) => {
  if (!req.query.term) {
    throw new BadRequestError(`Query string 'term' is required`);
  }
  const result = await Movie.aggregate([
    {
      $search: {
        autocomplete: {
          path: 'title',
          query: req.query.term,
          tokenOrder: 'any',
        },
      },
    },
    { $limit: 8 },
    {
      $project: {
        title: 1,
        year: 1,
        cast: 1,
      },
    },
  ]);

  if (!result) {
    throw new NotFoundError(`No movie with title ${req.query.term}`);
  }
  res.status(200).json(result);
};

const getMovieWithID = async (req, res) => {
  const { id } = req.params;
  const result = await Movie.findById(id).exec();

  if (!result) {
    throw new NotFoundError(`Movie with id ${req.params.id} not found`);
  }

  res.status(200).json(result);
};

const getMoviesWithTitle = async (req, res) => {
  const { sortBy, sort, page } = req.query;

  const sortByAcceptedValues = ['Default', 'A-Z', 'Rating', 'Runtime', 'Year'];
  if (!sortBy || !sortByAcceptedValues.includes(sortBy)) {
    throw new BadRequestError('Invalid sortBy query option');
  }

  if (!sort || (sort !== '1' && sort !== '-1')) {
    throw new BadRequestError('Invalid sort query option');
  }

  if (!page || parseInt(page) < 1 || isNaN(page)) {
    throw new BadRequestError('Invalid page option');
  }

  const convertToDBValue = (value) => {
    switch (value) {
      case 'A-Z':
        return 'title';
      case 'Rating':
        return 'imdb.rating';
      case 'Runtime':
        return 'runtime';
      case 'Year':
        return 'released';
    }
  };

  const mainBlock = []; //this will be returned as the end result

  const searchObject = {
    $search: {
      index: 'search',
    },
  };

  if (sortBy === 'Default') {
    searchObject.$search.compound = {
      must: [
        {
          text: {
            query: req.params.title,
            path: 'title',
            fuzzy: {
              maxEdits: 1,
              prefixLength: 3,
            },
            score: {
              function: {
                multiply: [
                  {
                    path: {
                      value: 'imdb.rating',
                      undefined: 2,
                    },
                  },
                  {
                    score: 'relevance',
                  },
                ],
              },
            },
          },
        },
      ],
      should: [
        {
          phrase: {
            query: req.params.title,
            path: 'title',
            score: {
              boost: {
                value: 5,
              },
            },
          },
        },
      ],
    };
  } else {
    const key = convertToDBValue(sortBy);
    const value = parseInt(sort);
    searchObject.$search.text = {
      query: req.params.title,
      path: 'title',
      fuzzy: {
        maxEdits: 1,
        prefixLength: 3,
      },
    };
    searchObject.$search.sort = {
      [key]: value,
    };
  }

  const projectObject = {
    $project: {
      title: 1,
      imdb: {
        rating: 1,
      },
      year: 1,
      metacritic: 1,
      tomatoes: {
        critic: {
          rating: 1,
        },
      },
      poster: 1,
      runtime: 1,
      plot: 1,
      rated: 1,
      genres: 1,
    },
  };

  // Every page has 20 movies === limit 20
  const skipVal = page * 20 - 20; // -20 because i always start with 20 from the 1rst page
  const facetObject = {
    $facet: {
      movies: [
        {
          $skip: skipVal,
        },
        {
          $limit: 20,
        },
      ],
      countResults: [
        {
          $replaceWith: '$$SEARCH_META',
        },
        {
          $limit: 1,
        },
      ],
    },
  };

  const setObject = {
    $set: {
      countResults: {
        $arrayElemAt: ['$countResults', 0],
      },
    },
  };

  mainBlock.push(searchObject, projectObject, facetObject, setObject);
  // console.log(util.inspect(mainBlock, { colors: true, depth: null }));

  const result = await Movie.aggregate(mainBlock);

  if (!result) {
    throw new NotFoundError(`Movie with name ${req.params.title} not found`);
  }

  res.status(200).json(result);
};

const moreLikeThis = async (req, res) => {
  const { id, title, plot, genres, fullplot } = req.body;

  const result = await Movie.aggregate([
    {
      $search: {
        index: 'facet',
        compound: {
          must: [
            {
              moreLikeThis: {
                like: [
                  {
                    plot,
                    fullplot,
                    genres,
                  },
                ],
              },
            },
          ],
          mustNot: [
            {
              equals: {
                path: 'title',
                value: title,
              },
            },
          ],
        },
      },
    },
    { $limit: 20 },
    {
      $project: {
        title: 1,
        poster: 1,
        rating: '$imdb.rating',
        score: { $meta: 'searchScore' },
      },
    },
  ]);

  return res.status(200).json(result);
};

// GET /search/advanced
const advancedSearch = async (req, res) => {
  const {
    sortBy,
    sort,
    page,
    title,
    genre,
    dateFrom,
    dateTo,
    ratingFrom,
    ratingTo,
    cast,
    plot,
  } = req.query;
  console.log(req.query);

  const sortByAcceptedValues = ['Default', 'A-Z', 'Rating', 'Runtime', 'Year'];
  if (!sortBy || !sortByAcceptedValues.includes(sortBy)) {
    throw new BadRequestError('Invalid sortBy query option');
  }

  if (!sort || (sort !== '1' && sort !== '-1')) {
    throw new BadRequestError('Invalid sort query option');
  }

  if (!page || parseInt(page) < 1 || isNaN(page)) {
    throw new BadRequestError('Invalid page option');
  }

  const convertToDBValue = (value) => {
    switch (value) {
      case 'A-Z':
        return 'title';
      case 'Rating':
        return 'imdb.rating';
      case 'Runtime':
        return 'runtime';
      case 'Year':
        return 'released';
    }
  };

  if (
    !title &
    !genre &
    !dateFrom &
    !dateTo &
    !ratingFrom &
    !ratingTo &
    !cast &
    !plot
  ) {
    return res.status(200).json({ docs: [] });
  }

  const searchBlock = {
    $search: {
      index: 'facet',
      facet: {
        operator: {
          compound: {
            must: [],
            should: [],
            filter: [],
          },
        },
        facets: {
          genresFacet: {
            type: 'string',
            path: 'genres',
            numBuckets: 30,
          },
        },
      },
    },
  };

  if (title) {
    const mustBlock = {
      text: {
        query: title,
        path: 'title',
        fuzzy: {
          maxEdits: 1,
          prefixLength: 3,
        },
      },
    };
    const shouldBlock = {
      phrase: {
        query: title,
        path: 'title',
        score: {
          boost: {
            value: 5,
          },
        },
      },
    };
    searchBlock.$search.facet.operator.compound.must.push(mustBlock);
    searchBlock.$search.facet.operator.compound.should.push(shouldBlock);
  }

  if (plot) {
    const mustBlock = {
      text: {
        query: plot,
        path: ['plot', 'fullplot'],
        fuzzy: {
          maxEdits: 1,
          prefixLength: 3,
        },
      },
    };
    const shouldBlock = {
      phrase: {
        query: plot,
        path: ['plot', 'fullplot'],
        score: {
          boost: {
            value: 5,
          },
        },
      },
    };
    searchBlock.$search.facet.operator.compound.must.push(mustBlock);
    searchBlock.$search.facet.operator.compound.should.push(shouldBlock);
  }

  if (genre) {
    const genreArr = genre.split(',');
    const genreAcceptedValues = [
      'Drama',
      'Comedy',
      'Music',
      'Action',
      'Romance',
      'Musical',
      'Crime',
      'Adventure',
      'Animation',
      'Short',
      'Mystery',
      'Documentary',
      'Sci-Fi',
      'History',
      'Fantasy',
      'Family',
      'War',
      'Sport',
      'News',
      'Thriller',
      'Film-Noir',
      'Biography',
      'Horror',
      'Talk-Show',
      'Western',
    ];
    genreArr.forEach((gen) => {
      if (!genreAcceptedValues.includes(gen)) {
        throw new UnprocessableEntityError(
          undefined,
          'Genre value not accepted'
        );
      }

      const filterBlock = {
        text: {
          query: gen,
          path: 'genres',
        },
      };
      searchBlock.$search.facet.operator.compound.filter.push(filterBlock);
    });
  }

  if (dateFrom || dateTo) {
    let validDateFrom = null;
    let validDateTo = null;

    const validateDate = (d) => {
      const date = new Date(d);
      if (isNaN(date.getTime())) {
        throw new BadRequestError(
          undefined,
          'Provide correct Date format (yyyy-mm-dd).'
        );
      }
      return date;
    };

    const filterBlock = {
      range: {
        path: 'released',
      },
    };

    if (dateFrom) {
      validDateFrom = validateDate(dateFrom);
      filterBlock.range.gte = validDateFrom;
    }

    if (dateTo) {
      validDateTo = validateDate(dateTo);
      filterBlock.range.lte = validDateTo;
    }

    if (dateFrom && dateTo && validDateFrom > validDateTo) {
      throw new BadRequestError(
        undefined,
        'Starting date cannot be greater than the ending date.'
      );
    }

    searchBlock.$search.facet.operator.compound.filter.push(filterBlock);
  }

  if (ratingFrom || ratingTo) {
    const numberFrom = Number(ratingFrom) || null;
    const numberTo = Number(ratingTo) || null;

    const filterBlock = {
      range: {
        path: 'imdb.rating',
      },
    };

    if (numberFrom && numberTo && numberFrom > numberTo) {
      throw new BadRequestError(
        undefined,
        'Starting rating cannot be greater than the ending rating.'
      );
    }

    if (numberFrom) {
      if (numberFrom < 1 || numberFrom > 10) {
        throw new BadRequestError(
          undefined,
          'Rating must be between 1 and 10.'
        );
      }
      filterBlock.range.gte = numberFrom;
    }

    if (numberTo) {
      if (numberTo < 1 || numberTo > 10) {
        throw new BadRequestError(
          undefined,
          'Rating must be between 1 and 10.'
        );
      }
      filterBlock.range.lte = numberTo;
    }

    searchBlock.$search.facet.operator.compound.filter.push(filterBlock);
  }

  if (cast) {
    const castArr = cast.split(',');

    const filterBlock = {
      phrase: {
        query: castArr,
        path: 'cast',
      },
    };

    searchBlock.$search.facet.operator.compound.filter.push(filterBlock);
  }

  const sortKey = convertToDBValue(sortBy);
  const sortValue = parseInt(sort);
  if (sortBy !== 'Default') {
    searchBlock.$search.sort = {
      [sortKey]: sortValue,
    };
  }

  // Every page has 20 movies === limit 20
  const skipVal = page * 20 - 20; // -20 because i always start with 20 from the 1rst page

  const [result] = await Movie.aggregate([
    searchBlock,

    {
      $facet: {
        docs: [
          {
            $project: {
              title: 1,
              imdb: {
                rating: 1,
              },
              year: 1,
              metacritic: 1,
              tomatoes: {
                critic: {
                  rating: 1,
                },
              },
              poster: 1,
              runtime: 1,
              plot: 1,
              rated: 1,
              genres: 1,
              cast: 1,
            },
          },
          {
            $skip: skipVal,
          },
          {
            $limit: 20,
          },
        ],
        meta: [{ $replaceWith: '$$SEARCH_META' }, { $limit: 1 }],
      },
    },
    {
      $set: {
        meta: { $arrayElemAt: ['$meta', 0] },
      },
    },
    {
      $project: {
        docs: 1,
        count: '$meta.count.lowerBound',
        buckets: '$meta.facet.genresFacet.buckets',
      },
    },
  ]);

  return res.status(200).json(result);
};

const getTopMovies = async (req, res) => {
  const { genre } = req.query;

  const genreAcceptedValues = [
    'All',
    'Drama',
    'Comedy',
    'Music',
    'Action',
    'Romance',
    'Musical',
    'Crime',
    'Adventure',
    'Animation',
    'Short',
    'Mystery',
    'Documentary',
    'Sci-Fi',
    'History',
    'Fantasy',
    'Family',
    'War',
    'Sport',
    'News',
    'Thriller',
    'Film-Noir',
    'Biography',
    'Horror',
    'Talk-Show',
    'Western',
  ];

  if (!genreAcceptedValues.includes(genre)) {
    throw new UnprocessableEntityError(
      undefined,
      'Genre values is not accepted.'
    );
  }

  const searchBlock = {
    $search: {
      index: 'facet',

      sort: { 'imdb.rating': -1 },
    },
  };

  if (genre === 'All') {
    searchBlock.$search.exists = {
      path: 'imdb.rating',
    };
  } else {
    searchBlock.$search.text = {
      query: genre,
      path: 'genres',
    };
  }
  const result = await Movie.aggregate([
    searchBlock,
    { $limit: 100 },
    {
      $project: {
        title: 1,
        imdb: {
          rating: 1,
        },
        year: 1,
        metacritic: 1,
        tomatoes: {
          critic: {
            rating: 1,
          },
        },
        poster: 1,
        runtime: 1,
        plot: 1,
        rated: 1,
        genres: 1,
      },
    },
  ]);

  return res.status(200).json(result);
};

module.exports = {
  autocomplete,
  getMovieWithID,
  getMoviesWithTitle,
  moreLikeThis,
  advancedSearch,
  getTopMovies,
};
