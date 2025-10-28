const CustomError = require('./custom-error');

class UnprocessableEntityError extends CustomError {
  constructor(
    error = 'UnprocessableContent',
    message = 'Your request does not pass the validation checks',
    details = []
  ) {
    super(422, error, message, details);
    this.error = error;
    this.message = message;
    this.details = details;
  }
}

module.exports = UnprocessableEntityError;
