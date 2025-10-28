const mongoose = require('mongoose');
const { hashValue } = require('../utils/bcryptHashing');

const emailRegex =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const passwordRegex = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,24}$/;

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      match: [emailRegex, 'Please provide a valid email'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      minLength: [4, 'Username must be 4-20 characters long'],
      maxLength: [20, 'Username must be 4-20 characters long'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      match: [
        passwordRegex,
        'Password must be at least 8-24 characters long and include an uppercase letter, a lowercase letter, a number, and a special character',
      ],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    ratings: [
      new mongoose.Schema(
        {
          rating: {
            type: Number,
            required: true,
          },
          movieId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Movie',
            required: true,
          },
        },
        {
          timestamps: true,
        }
      ),
    ],
    watchlist: [
      new mongoose.Schema(
        {
          movieId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Movie',
            required: true,
          },
        },
        {
          timestamps: true,
        }
      ),
    ],
  },
  {
    timestamps: true,
  }
);

UserSchema.pre('save', async function () {
  if (this.isNew || this.isModified('password')) {
    this.password = await hashValue(this.password);
  }
});

module.exports = mongoose.model('User', UserSchema);
