const CustomError = require('./custom-error');

class NotFoundError extends CustomError {
  constructor(
    error = 'NotFound',
    message = 'The requested resource was not found',
    details = []
  ) {
    super(404, 'NotFound', message, details);
    this.error = error;
    this.message = message;
    this.details = details;
  }
}

module.exports = NotFoundError;
