const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const verificationMessage = require('../utils/email/verificationMessage');
const passwordResetMessage = require('../utils/email/passwordResetMessage');

const sendEmail = async (to, subject, text, message, verificationLink) => {
  const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
  const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
  const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
  const REDIRECT_URI = 'http://localhost';

  const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );

  oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

  try {
    const accessToken = await oAuth2Client.getAccessToken();

    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: 'manoloulischristos@gmail.com',
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    const mailOptions = {
      from: 'no-reply <manoloulischristos@gmail.com>',
      to,
      subject,
      text,
      html:
        message === 'verification'
          ? verificationMessage(verificationLink)
          : passwordResetMessage(verificationLink),
    };

    const result = await transport.sendMail(mailOptions);
    return result;
  } catch (error) {
    throw new CustomError(
      undefined,
      undefined,
      'Something went wrong, click on the resend email button and try again.'
    );
  }
};

module.exports = sendEmail;
