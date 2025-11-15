const jwt = require('jsonwebtoken');
const sendEmail = require('../services/sendEmail');

const User = require('../models/User');
const Session = require('../models/Session');
const Verification = require('../models/Verification');

const { generateToken, hashToken } = require('../utils/tokenEncryption');
const { validateHashedValue } = require('../utils/bcryptHashing');
const verificationMessage = require('../utils/email/verificationMessage');

const {
  BadRequestError,
  UnauthorizedError,
  CustomError,
  ConflictError,
} = require('../errors');

// POST /auth/register

// Takes {email, username, password, persist} from body, the shcema validates them internaly,
// password gets hashed with bcrypt before it is saved to DB. Then it creates a userId and an access token as JWTs
// and a refresh token that is hashed and saved in the DB all tokens have expiration dates based
// on the persist value. Lastly it sends a verification email to the user and stores the refresh token in cookie.

const register = async (req, res) => {
  const { email, username, password, persist } = req.body;

  //Check for persist before creating the user because it is not validated by the UserSchema
  if (typeof persist !== 'boolean') {
    throw new BadRequestError(undefined, 'Validation failed for persist', [
      {
        field: 'persist',
        message: 'Path `persist` is required.',
      },
    ]);
  }

  // Check for duplicates (case insensitive)
  const duplicate = await User.findOne({ username })
    .collation({ locale: 'en', strength: 2 })
    .lean()
    .exec();

  if (duplicate) {
    throw new ConflictError(undefined, 'Duplicate values encountered', [
      { field: 'username', message: 'Username already exists.' },
    ]);
  }

  const user = await User.create({ email, username, password });

  if (!user) {
    throw new CustomError(
      undefined,
      undefined,
      'Something went wrong, please sign up again.'
    );
  }

  // Create JWTs
  const accessToken = jwt.sign(
    {
      sub: user._id,
    },
    process.env.PRIV_ACCESS_KEY,
    {
      algorithm: 'ES256',
      expiresIn: '15m',
    }
  );

  const userIdToken = jwt.sign(
    {
      sub: user._id,
      email: user.email,
      username: user.username,
      isVerified: false,
    },
    process.env.PRIV_USER_ID_KEY,
    { algorithm: 'ES256', expiresIn: '30m' }
  );

  // Generate Refresh Token
  const refreshToken = generateToken();
  const hashedToken = hashToken(refreshToken);

  const createdAt = new Date();
  const expirationTime = (persist ? 7 * 24 * 60 : 30) * 60 * 1000; // 7 days || 30 min
  const expiresAt = new Date(Date.now() + expirationTime);

  const session = await Session.create({
    hashedToken,
    persist,
    userId: user._id,
    createdAt,
    expiresAt,
  });

  // Verification document
  const verificationToken = generateToken();
  const verification = await Verification.create({
    token: verificationToken,
    userId: user._id,
  });

  if (!verification) {
    throw new CustomError(
      undefined,
      undefined,
      'Something went wrong, please sign up again.'
    );
  }

  // Send verification email
  const to = user.email;
  const subject = 'Verify your email';

  const text = `Hello ${user.username},

Please verify your account by copying and pasting the following link into your browser:
${req.headers.origin}/auth/verification?user=${user._id}&token=${verificationToken}

Link expires after 24 hours, in that case you need to resend a new link.

Thank You!`;

  // Must be set to this value in order for the helper function to pick the correct html boilerplate
  const message = 'verification';
  const verificationLink = `${req.headers.origin}/auth/verification?user=${user._id}&token=${verificationToken}`;

  // send
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

  res.cookie('token', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    maxAge: expirationTime,
  });

  return res.status(201).json({ accessToken, userIdToken });
};

// POST /auth/login

// Takes {email, password, persist} from body, compares to the DB values. Creates a userId and an access token as JWTs
// and updates the refresh token in the DB with a new one, all tokens have expiration dates based on the persist value.
// Stores the refresh token in a cookie.

const login = async (req, res) => {
  const { email, password, persist } = req.body;

  if (!email || !password || typeof persist !== 'boolean') {
    throw new BadRequestError(undefined, 'All fields are required');
  }

  const user = await User.findOne({ email }).exec();

  if (!user) {
    throw new UnauthorizedError(undefined, 'Incorrect username or password');
  }

  const isPasswordValid = await validateHashedValue(password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedError(undefined, 'Incorrect username or password');
  }

  // Create JWTs
  const accessToken = jwt.sign(
    {
      sub: user._id,
    },
    process.env.PRIV_ACCESS_KEY,
    {
      algorithm: 'ES256',
      expiresIn: '10m',
    }
  );

  const userIdToken = jwt.sign(
    {
      sub: user._id,
      email: user.email,
      username: user.username,
      isVerified: user.isVerified,
    },
    process.env.PRIV_USER_ID_KEY,
    {
      algorithm: 'ES256',
      expiresIn: '30m',
    }
  );

  // Generate Refresh Token
  const refreshToken = generateToken();
  const hashedToken = hashToken(refreshToken);

  const createdAt = new Date();
  const expirationTime = (persist ? 7 * 24 * 60 : 30) * 60 * 1000; // 7 days || 30 min
  const expiresAt = new Date(Date.now() + expirationTime);

  const session = await Session.findOneAndUpdate(
    { userId: user._id },
    { hashedToken, persist, isValid: true, createdAt, expiresAt },
    { new: true, upsert: true }
  );

  if (!session) {
    throw new CustomError(
      undefined,
      undefined,
      'Something went wrong, please sign in again.'
    );
  }

  res.cookie('token', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    maxAge: expirationTime,
  });

  return res.status(200).json({ accessToken, userIdToken });
};

//GET /auth/refresh

// Checks if the refresh token is valid and provides new access and userId token. It also updates the refresh token
// in the DB and the cookie.

const refresh = async (req, res) => {
  if (!req.cookies.token) {
    throw new UnauthorizedError('CookieError', 'Cookie is missing');
  }

  const storedHashedToken = hashToken(req.cookies.token);

  const storedSession = await Session.findOne({
    hashedToken: storedHashedToken,
  }).exec();

  if (!storedSession) {
    throw new UnauthorizedError(undefined, 'Credentials are wrong');
  }

  const currentTime = new Date();
  if (!storedSession.isValid || currentTime > storedSession.expiresAt) {
    throw new UnauthorizedError(
      'TokenExpiredError',
      'Your session has expired'
    );
  }

  const user = await User.findOne({ _id: storedSession.userId }).exec();

  if (!user) {
    throw new CustomError(
      undefined,
      undefined,
      'Something went wrong, please sign in again.'
    );
  }

  const refreshToken = generateToken();
  const hashedToken = hashToken(refreshToken);

  const persist = storedSession.persist;
  let expirationTime;

  // If persist is true then update just the token and calculate the remaining expiration time
  // to set the new cookie maxAge. Otherwise refresh the token for the user session for 30 min

  if (persist) {
    storedSession.hashedToken = hashedToken;
    expirationTime = storedSession.expiresAt.getTime() - Date.now(); // time based on  expiresAt - now
  } else {
    storedSession.hashedToken = hashedToken;
    storedSession.createdAt = new Date();
    expirationTime = 30 * 60 * 1000; // 30 min
    storedSession.expiresAt = new Date(Date.now() + expirationTime);
  }

  const session = await storedSession.save({ validateModifiedOnly: true });

  if (!session) {
    throw new CustomError(
      undefined,
      undefined,
      'Something went wrong, please sign in again.'
    );
  }

  const accessToken = jwt.sign({ sub: user._id }, process.env.PRIV_ACCESS_KEY, {
    algorithm: 'ES256',
    expiresIn: '10m',
  });

  const userIdToken = jwt.sign(
    {
      sub: user._id,
      email: user.email,
      username: user.username,
      isVerified: user.isVerified,
    },
    process.env.PRIV_USER_ID_KEY,
    {
      algorithm: 'ES256',
      expiresIn: '30m',
    }
  );

  res.cookie('token', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    maxAge: expirationTime,
  });

  return res.status(200).json({ accessToken, userIdToken });
};

// POST /auth/logout

// Finds the user session based on the cookie or the access token, invalidates the session token
// and deletes the cookie.
const logout = async (req, res) => {
  const cookies = req.cookies;
  const { id } = req.body;
  console.log(req.body);
  if (cookies?.token) {
    const refreshToken = cookies.token;
    const hashedToken = hashToken(refreshToken);
    findDocumentBy = { hashedToken };
    res.clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
    });
  } else {
    findDocumentBy = { userId: id };
  }

  const session = await Session.findOneAndUpdate(findDocumentBy, {
    isValid: false,
  });

  if (!session) {
    throw new CustomError(
      undefined,
      undefined,
      'Something went wrong, retry logging out'
    );
  }
  return res.status(200).json({ message: 'Logged out successfully.' });
};

module.exports = {
  register,
  login,
  refresh,
  logout,
};
