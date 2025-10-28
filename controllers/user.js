const User = require('../models/User');
const {
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
  ConflictError,
  CustomError,
} = require('../errors');
const { validateHashedValue } = require('../utils/bcryptHashing');
const Session = require('../models/Session');

//GET user/:id/settings
const getUser = async (req, res) => {
  const { id } = req.params;
  if (id !== req.userId) {
    throw new UnauthorizedError(undefined, 'Credentials are wrong.');
  }
  const user = await User.findOne(
    { _id: req.userId },
    'email username createdAt updatedAt'
  )
    .lean()
    .exec();
  // Check if access token user info is the same as the id
  return res.status(200).json(user);
};

//PATCH /user/:id/settings/username
const updateUsername = async (req, res) => {
  const { id } = req.params;
  const { username } = req.body;

  if (!id || !username) {
    throw new BadRequestError(undefined, 'Id and username are required.');
  }

  if (id !== req.userId) {
    throw new UnauthorizedError(undefined, 'Credentials are wrong.');
  }

  const duplicate = await User.findOne({ username })
    .collation({ locale: 'en', strength: 2 })
    .lean()
    .exec();

  if (duplicate) {
    throw new ConflictError(undefined, 'Duplicate values encountered', [
      { field: 'username', message: 'Username already exists' },
    ]);
  }

  await User.updateOne({ _id: id }, { $set: { username } });

  return res.status(200).json({ message: 'Username updated successfully' });
};

//PATCH /user/:id/settings/password
const updatePassword = async (req, res) => {
  const { id } = req.params;
  const { password, newPassword } = req.body;

  if (!id || !password || !newPassword) {
    throw new BadRequestError(undefined, 'Id and passwords are required.');
  }

  if (id !== req.userId) {
    throw new UnauthorizedError(undefined, 'Credentials are wrong.');
  }

  const user = await User.findOne({ _id: id });

  if (!user) {
    throw new CustomError(undefined, undefined, 'Something went wrong.');
  }

  const isPasswordValid = await validateHashedValue(password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedError(undefined, 'Password is not correct.');
  }

  user.password = newPassword;

  await user.save({ validateModifiedOnly: true });

  return res.status(200).json({ message: 'Password updated successfully' });
};

const deleteAccount = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  const cookies = req.cookies;

  if (id !== req.userId) {
    throw new UnauthorizedError(undefined, 'Credentials are wrong');
  }

  const user = await User.findOne({ _id: id }).exec();

  const isPasswordValid = await validateHashedValue(password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedError(undefined, 'Password is not correct.');
  }

  await Session.findOneAndDelete({ userId: id });
  await User.findOneAndDelete({ _id: id });

  if (cookies?.token) {
    res.clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
    });
  }

  res.status(200).json({ message: 'Account deleted successfully' });
};

module.exports = { getUser, updateUsername, updatePassword, deleteAccount };
