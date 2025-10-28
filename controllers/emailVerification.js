const jwt = require('jsonwebtoken');
const sendGrid = require('@sendgrid/mail');

const User = require('../models/User');
const Session = require('../models/Session');
const Verification = require('../models/Verification');

const { generateToken, hashToken } = require('../utils/tokenEncryption');
const verificationMessage = require('../utils/email/verificationMessage');

const { UnauthorizedError, CustomError, ConflictError } = require('../errors');

// GET /auth/verification

// Validates the user based on the link provided via the email

const verification = async (req, res) => {
  const { user: userQuery, token: tokenQuery } = req.query;

  const user = await User.findOne({ _id: userQuery }).exec();

  if (!user) {
    throw new UnauthorizedError(
      undefined,
      'Credentials are wrong. Please sign in and request a new code.'
    );
  }

  if (user.isVerified) {
    throw new ConflictError(
      undefined,
      'Your account has already been verified.'
    );
  }

  const verification = await Verification.findOne({
    token: tokenQuery,
    userId: userQuery,
  }).exec();

  // Verification has been deleted
  if (!verification) {
    throw new UnauthorizedError(
      undefined,
      'Your verification code has expired. Please click the resend button to get a new code.'
    );
  }

  user.isVerified = true;

  await user.save({ validateModifiedOnly: true });
  await verification.deleteOne();

  // No cookie
  if (!req.cookies.token) {
    return res
      .status(200)
      .json({ message: 'Your account has been verified. Please sign in.' });
  }
  //If there is a cookie the refresh endpoint is reached first and the user is signed in automatically

  return res.status(200).json({ message: 'Your account has been verified.' });
};

// POST /verification/resend

// Sends an email with a new token

const resendVerificationEmail = async (req, res) => {
  const { id } = req.body;

  const user = await User.findOne({ _id: id });
  if (!user) {
    throw new UnauthorizedError(undefined, 'Credentials are wrong');
  }

  if (user.isVerified) {
    throw new ConflictError(
      undefined,
      'Your account has already been verified.'
    );
  }

  const verification = await Verification.findOne({ userId: user._id }).exec();

  const verificationToken = generateToken();
  let endResult;
  if (!verification) {
    endResult = await Verification.create({
      token: verificationToken,
      userId: user._id,
    });
  } else {
    verification.createdAt = new Date();
    verification.token = verificationToken;
    endResult = await verification.save({ validateModifiedOnly: true });
  }

  if (!endResult) {
    throw new CustomError(
      undefined,
      'Something went wrong, click on the resend email button and try again.'
    );
  }

  // Send verification email
  sendGrid.setApiKey(process.env.SENDGRID_API_KEY);
  const emailText = `Hello ${user.username},

  Please verify your account by copying and pasting the following link into your browser:
  ${req.headers.origin}/auth/verification?user=${user._id}&token=${verificationToken}

  Link expires after 24 hours, in that case you need to resend a new link.

  Thank You!`;

  const verificationLink = `${req.headers.origin}/auth/verification?user=${user._id}&token=${verificationToken}`;

  sendGrid
    .send(
      verificationMessage(
        user.email,
        user.username,
        emailText,
        verificationLink
      )
    )
    .then(() => {})
    .catch((error) => {
      throw new CustomError(
        undefined,
        undefined,
        'Something went wrong, click on the resend email button and try again.'
      );
    });

  return res.status(200).json({
    message:
      'We have sent an email to your address with a verification link, please also check the spam folder.',
  });
};

module.exports = {
  verification,
  resendVerificationEmail,
};
