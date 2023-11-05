const nodemailer = require('nodemailer');
require("dotenv").config();

// Replace these with your actual Gmail credentials or SMTP server details
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'whiteangle654123@gmail.com',
      pass:  process.env.MAILER_APP_PASS,
    },
  });


let sendMail = async (email, resetToken, userId) => {
  console.log("email",email)
    try {
        const mailOptions = {
          from: 'whiteangle654123@gmail.com',
          to: email,
          subject: 'Password Reset',
          html: `<p>Hello,</p><p>Please click the following link to reset your password:</p>
                <a href="http://localhost:9999/auth/reset-link-verify?token=${resetToken}&userid=${userId}">Reset Password</a>`,
        };
    
        const info = await transporter.sendMail(mailOptions);
        // Check if at least one recipient email address was accepted
        const isEmailSent = info.accepted && info.accepted.length > 0;

        // Return true if email was successfully sent, otherwise false
        return isEmailSent;
      
      } catch (error) {
        console.error('Error sending email: ', error);
        res.status(500).json({ error: 'Error in sending the email' });
      }
}



module.exports =  {sendMail}