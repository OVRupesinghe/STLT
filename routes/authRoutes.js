const express = require('express');
const router  = express.Router()
const bcrypt = require('bcrypt');
const { sequelize } = require('../db.config');
const User = require('../schema/UserSchema');
const axios = require('axios');
const jwt = require('jsonwebtoken')
const {sendOTP, sendMail} = require('../utils/authMessenger');
const { generateOTP, generateRandomString, generateQRCode } = require('../utils/authHelper');

// const client = require('../elephantsql');


router.post('/register', async (req,res) => {

     //Destructure the request data
     const {
        username,
        pass,
        nic,
        fname,
        lname,
        contact,
        email,
      } = req.body;

    try {
          
            // Check if username or NIC already exists

            const existingUser = await User.findOne({
              where: {
                [Op.or]: [
                  { username },
                  { NIC: nic },
                  { email }
                ]
              }
            });
        
            if (existingUser !== null) {
              return res.status(400).json({ error: 'Username or NIC already taken' });
            }
        
            // Encrypt the password using bcrypt
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(pass, saltRounds);
        
            // Generate the secret (hash of password + NIC)
            const secret = await bcrypt.hash(pass + nic, saltRounds);

            // Generate a 6-digit OTP
            const {otp, otpExpiration} = generateOTP();
        
            // Insert user data into the database
            const User = require('../schema/UserSchema');

            const newUser = await User.create({
              username,
              password: hashedPassword,
              nic,
              fname,
              lname,
              secret,
              email,
              contact_no: contact,
              otp,
              otp_expiration: otpExpiration
            });

            // Return the newly created user
            //res.json(newUser.rows[0]);
            generateQRCode(nic,secret);
            
            //call method for sending otp
            if(sendOTP(otp, contact)){
              req.session.userID = newUser.id;
              res.json({ message: 'User created and OTP sent successfully' });
            }else{
              res.json({ message: 'Could not send the OTP' });
            }
            // req.session.userID = newUser.rows[0].userid;
            // res.json({ message: 'User created and OTP sent successfully' });


    } catch (error) {
        console.error('Error during user registration:', error);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
})

router.post('/verify-otp', async (req, res) => {
  //get the otp and the userID
  const userID = req.session.userID;
  const { otp } = req.body;
  console.log(userID);
  console.log(otp);
  try {
    // Retrieve the user from the database based on the provided username
    const user = await User.findByPk(userID);

    if (!user) {
      console.log(userID);
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the OTP and its expiration time match
    if (parseInt(user.otp) != otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (new Date(user.otp_expiration) < new Date()) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    // Set the otp and the expiration fields to null
    await User.update({ contact_verified: true, otp: null, otp_expiration: null }, { where: { id: userID } });

    // Clear userID from the session after successful verification
    delete req.session.user;

    res.json({ message: 'OTP verification successful' });
  } catch (error) {
    console.error('Error during OTP verification:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
  

router.get('/request-new-otp', async(req,res) => {
  const userID = req.session.userID;
  
  try {
    // Retrieve the user from the database based on the provided username
    const user = await User.findOne({ where: { id: userID } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate a 6-digit OTP
    const {otp, otpExpiration} = generateOTP();
    

    // Update the user's otp and the expiration time to the newly generated once
    await User.update({ otp: otp, otp_expiration: otpExpiration }, { where: { id: userID } });

    //Send the new OTP to the user
    //call method for sending otp
    if(sendOTP(newOtp, user.contact_no)){
     res.json({ message: 'New OTP has been sent.' });
    }else{
      res.json({ message: 'Could not send the OTP' });
    }
    // res.json({ message: 'New OTP has been sent.' });

  } catch (error) {
    console.error('Error during sending new OTP', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

router.post('/login', async (req,res) => {
  const { username, pass } = req.body;

  try {
    // Retrieve the user from the database based on the provided username
    const user = await User.findOne({ where: { username: username } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    //Check whether the user account is verified or not
    //If not verified then send them to verification page, else continue
    if(!user.contact_verified){
      return res.status(401).json({ error: 'Unverified Account' });
    }

    // Compare the provided password with the hashed password from the database
    const isPasswordValid = await bcrypt.compare(pass, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // User is authenticated. Generate a JWT token with user information.
    const userrole = "general-user";
    const fname = user.fname;

    const payload = {
      userid: user.id,
      username: username,
      userrole: userrole
    };

    const secretKey = process.env.JWT_TOKEN_SECRET; // Replace with a strong secret key for signing the token
    const accessToken = jwt.sign(payload, secretKey, { expiresIn: '15m' }); // Access token expires in 1 hour
    const refreshToken = jwt.sign(payload, secretKey, { expiresIn: '7d' }); // Refresh token expires in 1 day

    
    await sequelize.query(`DELETE FROM user_tokens WHERE userid = ${user.id}`);
    await sequelize.query(`INSERT INTO user_tokens(userid,refresh_token) VALUES(${user.id},${refreshToken})`);

    res.cookie('jwt', refreshToken, {httpOnly: true, sameSite:'none', secure:true, maxAge:24*60*60*1000})
    res.json({ fname, username, userrole, accessToken });

  } catch (error) {
    console.error('Error during user login:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

router.get('/refresh', async (req,res) => {
  const cookies = req.cookies;

  try {

    if(!cookies?.jwt) return res.sendStatus(401);
    console.log(cookies.jwt)
    const refreshToken = cookies.jwt;
    
    // Retrieve the user from the database based on the provided username
    const user = await User.findOne({
      include: [{
        model: UserToken,
        where: { refresh_token: refreshToken }
      }]
    });

    if(!user) {
      console.log("No user found")
      return res.sendStatus(403); //Forbidden
    }

    const userrole = "general-user";
    const username = user.username;
    const fname = user.fname;
    // User is authenticated. Generate a JWT token with user information.
    const payload = {
      userid: user.id,
      username: username,
      userrole: userrole
    };

    jwt.verify(
      refreshToken,
      process.env.JWT_TOKEN_SECRET,
      (err,tokenData) =>{
        if(err || user.rows[0].userid != tokenData.userid) return res.sendStatus(403);
        const accessToken = jwt.sign(
          payload,
          process.env.JWT_TOKEN_SECRET,
          { expiresIn: '15m' }
        )
        res.json({ fname, username, userrole, accessToken })
      }
    )

   

  } catch (error) {
    console.error('Error refreshing the token:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

router.get('/logout', async (req,res) => {
  const cookies = req.cookies;

  try {

    if(!cookies?.jwt) return res.sendStatus(204);
    const refreshToken = cookies.jwt;
    
    // Retrieve the user from the database based on the provided username
    const user = await sequelize.query(`SELECT * FROM user_tokens WHERE refresh_token = ${refreshToken}`);

    if(!user) {
      res.clearCookie('jwt', {httpOnly: true, sameSite:'none', secure:true});
      return res.sendStatus(204); 
    }
    
    await sequelize.query(`DELETE FROM user_tokens WHERE userid = ${user.id}`);

    res.clearCookie('jwt', {httpOnly:true, sameSite:'none', secure:true});
    res.sendStatus(204);
  } catch (error) {
    console.error('Error in logging out:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

router.post('/forgot-password', async (req,res) => {
  const {recoveryMode, recoveryOption} = req.body;
  //1-Phone OTP and 0-Email
  if(recoveryMode == 1){
     // Retrieve the user from the database based on the provided username
     let user = await pool.query('SELECT * FROM users WHERE contactno = $1', [recoveryOption]);

     if (user.rows.length === 0) {
       return res.status(404).json({ error: 'No account associated with the given contact number' });
     }
     user = user.rows[0];
     const {otp, otpExpiration} = generateOTP();
 
     // Update the user's otp and the expiration time to the newly generated once
     await pool.query('UPDATE users SET otp = $1, otp_expiration = $2 WHERE userid = $3', [otp,otpExpiration,user.userid]);
     if(sendOTP(newOtp,user.contact)){
        res.json({ message: 'Reset OTP has been sent.' });
      }else{
        res.json({ message: 'Could not send the OTP' });
      }
    //res.json({ message: 'Reset OTP has been sent.' });
  
  }
  else if(recoveryMode == 0){
    // Retrieve the user from the database based on the provided username
    let user = await pool.query('SELECT * FROM users WHERE email = $1', [recoveryOption]);

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'No account associated with the given email' });
    }
    user = user.rows[0];
    let randomString = generateRandomString(10)
    let exp = new Date(Date.now() + 3 * 60 * 1000);

    // Update the user's otp and the expiration time to the newly generated once
     await pool.query('DELETE FROM pwd_reset_tokens WHERE userid = $1', [user.userid]);
     await pool.query('INSERT INTO pwd_reset_tokens(userid, reset_token, token_expiration) values($1,$2,$3)', [user.userid, randomString, exp]);

    if(sendMail(recoveryOption, randomString, user.userid)){
      res.status(200).json({ message: 'Reset Email has been sent.' });
    }
    else{
     res.json({ message: 'Could not send the Reset Mail' });
   }

  }

})

router.post('/reset-otp-verify', async(req,res) => {
  
  const { otp } = req.body;

  try {
    // Retrieve the user from the database based on the provided username
    const user = await pool.query('SELECT * FROM users WHERE otp = $1', [otp]);
  
    if (user.rows.length === 0) {
      console.log(userID);
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the OTP and its expiration time match
    if (user.rows[0].otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    
    if (new Date(user.rows[0].otp_expiration) < new Date()) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    await pool.query('UPDATE users SET contact_verified = true, otp = null, otp_expiration = null WHERE userid = $1', [user.rows[0].userid]);

    req.session.userid = user.rows[0].userid;
    res.status(200).json('Valid OTP')
  }catch (error) {
    console.error('Error during OTP verification:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

router.get('/reset-link-verify', async (req,res) => {
  const userid = req.query.userid;
  const token = req.query.token;

  try {
    // Retrieve the user from the database based on the provided username
    const user = await pool.query('SELECT * FROM pwd_reset_tokens WHERE userid = $1', [userid]);
  
    if (user.rows.length === 0) {
      console.log(userID);
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the OTP and its expiration time match
    if (user.rows[0].reset_token !== token) {
      return res.status(400).json({ error: 'Invalid Token' });
    }
    
    if (new Date(user.rows[0].token_expiration) < new Date()) {
      return res.status(400).json({ error: 'Reset link has expired' });
    }

    req.session.userid = user.rows[0].userid;
    res.status(200).json('Valid reset link')
  }catch (error) {
    console.error('Error with reset link:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }

})

router.post('/reset-password', async (req,res) => {
  const userid = req.session.userid;
  const { newPassword, newPasswordConfirm } = req.body;

  try {
    // Retrieve the user from the database based on the provided username
    const user = await pool.query('SELECT * FROM pwd_reset_tokens WHERE userid = $1', [userid]);
  
    if (user.rows.length === 0) {
      console.log(userID);
      return res.status(404).json({ error: 'User not found' });
    }

    
    if (newPassword !== newPasswordConfirm){
      return res.status(400).json({ error: 'Passwords does not match' });
    }

    // Encrypt the password using bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    const updatePwd = await pool.query('UPDATE users SET password = $1 WHERE userid = $2', [hashedPassword,userid]);
    
    if(updatePwd){
      delete req.session.userid;
      return res.status(200).json('Password resetted successfully')
    }else{
      return res.status(200).json('Could not update the password')
    }
    
  }catch (error) {
    console.error('Error with reset link:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }

})

module.exports = router