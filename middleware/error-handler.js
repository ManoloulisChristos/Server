const errorHandler = (err, req, res, next) => {
  const errorMessage = {
    status: err.status ?? 500,
    error: err.error ?? 'InternalServerError',
    message: err.message ?? 'Something went wrong',
    details: err.details ?? [],
  };

  // Mongoose always checks first for validation and then for duplicate values.
  // Validation error
  if (err.name === 'ValidationError') {
    let isValueMissing = false;
    for (let key in err.errors) {
      const detailsObj = {};
      if (err.errors[key].name === 'CastError') {
        detailsObj.field = err.errors[key].path;
        detailsObj.message = `Field ${err.errors[key].path} expects a ${
          err.errors[key].kind[0].toLowerCase() + err.errors[key].kind.slice(1)
        }`;
      } else {
        detailsObj.field = err.errors[key].path;
        detailsObj.message = err.errors[key].message;
      }

      if ((err.errors[key].kind = 'required')) {
        isValueMissing = true;
      }
      errorMessage.details.push(detailsObj);
    }
    errorMessage.status = isValueMissing ? 400 : 422;
    errorMessage.error = isValueMissing ? 'BadRequest' : 'UnprocessableEntity';
    errorMessage.message = `Validation failed for ${[
      ...errorMessage.details.map((detail) => detail.field),
    ].join(', ')}`;
  }

  // Duplicate values error (only 1 field is returned even if there are multiple duplicate fields)
  if (err.code && err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    errorMessage.status = 409;
    errorMessage.error = 'Conflict';
    errorMessage.message = 'Duplicate values encountered';
    errorMessage.details.push({
      field,
      message: `${
        field[0].toUpperCase() + field.slice(1)
      } ${value} already exists`,
    });
  }

  // Cast error (when quering a Model and provide a wrong type for a field)
  if (err.name === 'CastError') {
    errorMessage.status = 400;
    errorMessage.error = 'BadRequest';
    errorMessage.message = 'Invalid data type';
    errorMessage.details.push({
      field: err.path,
      message: `Field ${err.path} expects ${
        err.kind[0].toLowerCase() + err.kind.slice(1)
      }`,
    });
  }

  // return res.status(500).json(err); //Testing only use for mongoose errors or if you modify the err object
  return res.status(errorMessage.status).json(errorMessage);
};

module.exports = errorHandler;
