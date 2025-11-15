const sendEmail = require('../services/sendEmail');

const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');

const { generateToken } = require('../utils/tokenEncryption');

const {
  BadRequestError,
  UnauthorizedError,
  CustomError,
  NotFoundError,
  ForbiddenError,
} = require('../errors');

// POST /password/resend

// Sends email with password reset token

const sendPasswordResetEmail = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email }).exec();

  if (!user) {
    throw new NotFoundError(undefined, 'The email you provided is not correct');
  }

  let passwordReset;
  const resetPasswordToken = generateToken();

  const savedPasswordReset = await PasswordReset.findOne({
    userId: user._id,
  }).exec();
  // If there is already a token in the db increase the count else create new doc
  if (savedPasswordReset) {
    if (savedPasswordReset.count >= 2) {
      throw new ForbiddenError(
        undefined,
        'You have exceeded the allowed number of requests permitted for this service. Try again later.'
      );
    }
    savedPasswordReset.token = resetPasswordToken;
    savedPasswordReset.count = savedPasswordReset.count + 1;
    savedPasswordReset.createdAt = new Date();
    passwordReset = await savedPasswordReset.save({
      validateModifiedOnly: true,
    });
  } else {
    passwordReset = await PasswordReset.create({
      token: resetPasswordToken,
      userId: user._id,
    });
  }

  if (!passwordReset) {
    throw new CustomError(
      undefined,
      undefined,
      'Something went wrong, please try again'
    );
  }

  // Send verification email
  const to = user.email;
  const subject = 'Reset your password';
  const text = `Hello ${user.username},

  You can reset your password by copying and pasting the following link into your browser:
  ${req.headers.origin}/auth/password/validation?user=${user._id}&token=${resetPasswordToken}

  Link expires after 30 minutes, in that case you need to resend a new link.

  Thank You!`;

  // Must be set to this value in order for the helper function to pick the correct html boilerplate
  const message = 'password_reset';
  const verificationLink = `${req.headers.origin}/auth/password/validation?user=${user._id}&token=${resetPasswordToken}`;

  sendEmail(to, subject, text, message, verificationLink)
    .then((result) => {
      console.log(result);
    })
    .catch((error) => {
      console.log(error);
      throw new CustomError(
        undefined,
        undefined,
        'Something went wrong, please sign up again.'
      );
    });

  return res.status(200).json({
    message:
      'We have sent an email to your address with a reset link, please check the spam folder',
  });
};

// GET /password/validation

// Validates the reset password link so the user can procced to the next step

const passwordResetLinkValidation = async (req, res) => {
  const { user: userQuery, token: tokenQuery } = req.query;

  const passwordReset = await PasswordReset.findOne({
    token: tokenQuery,
    userId: userQuery,
  })
    .lean()
    .exec();
  if (!passwordReset) {
    throw new UnauthorizedError(
      undefined,
      'Your link has expired, please request a new one.'
    );
  }

  return res.status(200).json({
    message: 'Your link is correct, proceed in reseting your password.',
  });
};

// POST /password/validation

// Validation for reset password operation

const passwordResetValidation = async (req, res) => {
  const { user: userQuery, token: tokenQuery } = req.query;
  const { password } = req.body;

  if (!password) {
    throw new BadRequestError(undefined, 'Password field is required');
  }

  const passwordReset = await PasswordReset.findOne({
    token: tokenQuery,
    userId: userQuery,
  }).exec();
  if (!passwordReset) {
    throw new UnauthorizedError(
      undefined,
      'Your link has expired, please request a new one and try again.'
    );
  }

  const user = await User.findOne({ _id: userQuery }).exec();
  // This should not happen
  if (!user) {
    throw new UnauthorizedError(undefined, 'Credentials are wrong');
  }

  user.password = password;

  await user.save({ validateModifiedOnly: true });
  await passwordReset.deleteOne();

  res
    .status(200)
    .json({ message: 'Your password has been reset successfully' });
};

module.exports = {
  sendPasswordResetEmail,
  passwordResetLinkValidation,
  passwordResetValidation,
};
