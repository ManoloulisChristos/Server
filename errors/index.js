const BadRequestError = require('./bad-request');
const ConflictError = require('./conflict');
const CustomError = require('./custom-error');
const ForbiddenError = require('./forbidden');
const MethodNotAllowedError = require('./method-not-allowed');
const NotFoundError = require('./not-found');
const UnauthorizedError = require('./unauthorized');
const UnprocessableEntityError = require('./unprocessable-content');

module.exports = {
  BadRequestError,
  ConflictError,
  CustomError,
  ForbiddenError,
  MethodNotAllowedError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableEntityError,
};
