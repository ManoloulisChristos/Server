const express = require('express');
const router = express.Router();

const { register, login, refresh, logout } = require('../controllers/auth');
const {
  verification,
  resendVerificationEmail,
} = require('../controllers/emailVerification');
const {
  sendPasswordResetEmail,
  passwordResetValidation,
  passwordResetLinkValidation,
} = require('../controllers/passwordReset');

const verifyJWT = require('../middleware/verifyJWT');
const invalidMethod = require('../middleware/invalidMethod');
const loginLimiter = require('../middleware/loginLimiter');
const resendCodeLimiter = require('../middleware/resendCodeLimiter');

const allowedMethods = {
  '/register': ['POST'],
  '/login': ['POST'],
  '/refresh': ['GET'],
  '/logout': ['POST'],
  '/verification': ['GET'],
  '/verification/resend': ['POST'],
  '/password/resend': ['POST'],
  '/password/validation': ['GET', 'POST'],
};

// Authentication
router.route('/register').post(register);
router.route('/login').post(loginLimiter, login);
router.route('/refresh').get(refresh);
router.route('/logout').post(logout);

// Email Verification
router.route('/verification').get(verification);
router
  .route('/verification/resend')
  .post(resendCodeLimiter, resendVerificationEmail);

// Reset Password
router
  .route('/password/resend')
  .post(resendCodeLimiter, sendPasswordResetEmail);
router
  .route('/password/validation')
  .get(passwordResetLinkValidation)
  .post(passwordResetValidation);

// Not allowed methods
router.use(invalidMethod(allowedMethods));

module.exports = router;
