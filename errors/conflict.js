const CustomError = require('./custom-error');

class ConflictError extends CustomError {
  constructor(
    error = 'Conflict',
    message = 'The request conflicts with already stored data',
    details = []
  ) {
    super(409, error, message, details);
    this.error = error;
    this.message = message;
    this.details = details;
  }
}

module.exports = ConflictError;
