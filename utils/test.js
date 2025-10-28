require('dotenv').config();
const sendGrid = require('@sendgrid/mail');
sendGrid.setApiKey(process.env.SENDGRID_API_KEY);
const verificationMessage = require('./email/verificationMessage');
sendGrid
  .send(
    verificationMessage(
      'xristos1510@gmail.com',
      'hello',
      'Xristos90',
      'https://google.com'
    )
  )
  .then(() => {
    console.log('Email sent');
  })
  .catch((error) => {
    console.log(error);
    throw new CustomError(
      undefined,
      undefined,
      'Something went wrong, please sign up again.'
    );
  });
