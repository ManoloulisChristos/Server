const notFound = (req, res) => {
  errorMessage = {
    status: 404,
    error: 'NotFound',
    message: 'Route does not exist',
    details: [],
  };
  res.status(404).json(errorMessage);
};

module.exports = notFound;
