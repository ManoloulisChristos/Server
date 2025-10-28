const CustomError = require('./custom-error');

class BadRequestError extends CustomError {
  constructor(
    error = 'BadRequest',
    message = 'The request was wrong, please try again',
    details = []
  ) {
    super(400, error, message, details);
    this.error = error;
    this.message = message;
    this.details = details;
  }
}

module.exports = BadRequestError;
