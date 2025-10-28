const Movie = require('../models/Movie');

async function removeDuplicates() {
  try {
    const result = await Movie.aggregate([
      {
        $group: {
          _id: {
            title: '$title',
            year: '$year',
            // Add other fields that define uniqueness
          },
          uniqueDoc: { $first: '$$ROOT' },
        },
      },
      {
        $replaceRoot: { newRoot: '$uniqueDoc' },
      },
      {
        $merge: {
          into: 'movies',
          on: '_id',
          whenMatched: 'replace',
          whenNotMatched: 'insert',
        },
      },
    ]);

    console.log('Duplicates removed successfully');
  } catch (error) {
    console.error('Error removing duplicates:', error);
  }
}

removeDuplicates();
