const CustomError = require('./custom-error');

class MethodNotAllowedError extends CustomError {
  constructor(
    error = 'MethodNotAllowed',
    message = 'Not a supported method for this route',
    details = []
  ) {
    super(405, 'MethodNotAllowed', message, details);
    this.error = error;
    this.message = message;
    this.details = details;
  }
}

module.exports = MethodNotAllowedError;
