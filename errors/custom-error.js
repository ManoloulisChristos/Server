class CustomError extends Error {
  constructor(status, error, message, details) {
    super(message);
    this.status = status ?? 500;
    this.error = error ?? 'InternalServerError';
    this.message = message ?? 'Something went wrong';
    this.details = details ?? [];
  }
}

module.exports = CustomError;
