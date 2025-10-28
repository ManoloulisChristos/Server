const CustomError = require('./custom-error');

class UnauthorizedError extends CustomError {
  constructor(
    error = 'Unauthorized',
    message = 'Invalid Credentials',
    details = []
  ) {
    super(401, error, message, details);
    this.error = error;
    this.message = message;
    this.details = details;
  }
}

module.exports = UnauthorizedError;
