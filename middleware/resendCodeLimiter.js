const { rateLimit } = require('express-rate-limit');

const resendCodeLimiter = rateLimit({
  windowMs: 30 * 1000,
  limit: 2,
  message: {
    message:
      'Too many attempts from this IP, please try again after 30 seconds',
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = resendCodeLimiter;
