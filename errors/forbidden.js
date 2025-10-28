const CustomError = require('./custom-error');

class ForbiddenError extends CustomError {
  constructor(
    error = 'Forbidden',
    message = 'Access not allowed',
    details = []
  ) {
    super(403, error, message, details);
    this.error = error;
    this.message = message;
    this.details = details;
  }
}

module.exports = ForbiddenError;
