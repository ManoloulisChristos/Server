const { MethodNotAllowedError } = require('../errors');

const invalidMethod = (allowedMethods) => {
  return (req, res, next) => {
    // Normalize the path if it ends with /
    const path =
      req.path !== '/'
        ? req.path.endsWith('/')
          ? req.path.slice(0, -1)
          : req.path
        : req.path;
    // Check the allowedMethods object if the path string is the same as the route
    // and also if the method is allowed from that path
    Object.entries(allowedMethods).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}$`);
      if (regex.test(path)) {
        if (!value.includes(req.method)) {
          // Correct path not accepted method
          const methodsString = value.join(', ');
          res.set('Allow', methodsString); // Set Allow header which is required for a 405 error
          throw new MethodNotAllowedError(
            `This path only accepts ${methodsString} methods`
          );
        }
      }
    });
    next(); //If it reaches here the path is wrong and the not-found generic middleware should handle it (404);
  };
};

module.exports = invalidMethod;
