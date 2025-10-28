require('dotenv').config();
require('express-async-errors');
const express = require('express');
const app = express();
// const mongoose = require('mongoose');
// mongoose.set('debug', true);
const cors = require('cors');
// const corsOptions = require('./config/corsOptions');
const compression = require('compression');

const cookieParser = require('cookie-parser');

// connect DB
const connectDB = require('./config/connect');

// Routers
const searchRouter = require('./routes/search');
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const commentRouter = require('./routes/comment');

// JWT authentication
const verifyJWTMiddleware = require('./middleware/verifyJWT');

// error handler
const notFoundMiddleware = require('./middleware/not-found');
const errorHandlerMiddleware = require('./middleware/error-handler');

const corsOptions = {
  origin: 'https://moovies-spys7.ondigitalocean.app',
  credentials: true,
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(compression());
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

// Routes
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/user', verifyJWTMiddleware, userRouter);
app.use('/api/v1/comment', commentRouter);

// Errors
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 8080;

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, () => console.log(`app is listening on port ${port}...`));
  } catch (error) {
    console.log(error);
  }
};

start();
