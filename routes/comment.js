const express = require('express');
const router = express.Router();

const {
  getComments,
  addComment,
  updateComment,
  deleteComment,
  getUserComments,
} = require('../controllers/comment');
const invalidMethodMiddleware = require('../middleware/invalidMethod');
const verifyJWTMiddleware = require('../middleware/verifyJWT');

const allowedMethods = {
  '/': ['POST', 'PATCH', 'DELETE'],
  '/[^/]+': ['GET'],
  '/user/[^/]+': ['GET'],
};

router.route('/:id').get(getComments);

//Protected
router.use(verifyJWTMiddleware);

router.route('/').post(addComment).patch(updateComment).delete(deleteComment);
router.route('/user/:id').get(getUserComments);

// Not allowed methods
router.use(invalidMethodMiddleware(allowedMethods));

module.exports = router;
