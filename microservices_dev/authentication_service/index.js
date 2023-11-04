const express = require('express');
const app = express();
require('dotenv').config();
const fs = require('fs');
const {v4: uuid } = require('uuid');
const cors = require('cors'); 
const data = require('./schema/data.json');
const exisitingUsers = require('./schema/existing_users.json');

app.use(express.json());

app.post('/login', (req, res) => {
 
  const { username, pass } = req.body;

  for (var user of data) {
    if (user.username === username && user.password === pass) {
      res.statusCode = 200;
      const userId= user.id;
      const userrole = user.role;
      res.json({message: "Login successful", userId, userrole});
      return;
    }
  }
  res.statusCode = 401;
  res.json({message: "Login failed"});
});
//function to check whether username already exists
app.get('/checkusername/:username', (req, res) => {
  const username = req.params.username;
  for (var user of data) {
    if (user.username == username) {
      res.statusCode = 200;
     //return user id
      res.json({message: "Username already exists"});
      return;
    }
  }
  res.statusCode = 200;
  res.json({message: "Username not found"});
});

app.get('/checkemail/:email', (req, res) => {
  const email = req.params.email;
  for (var user of data) {
    if (user.email == email) {
      res.statusCode = 200;
      res.json({message: "User with this email already exists"});
      return;
    }
  }
  res.statusCode = 200;
  res.json({message: "Email not found"});
});
 
app.get('/checkphone/:phone', (req, res) => {
  const phone = req.params.phone;
  for (var user of data) {
    if (user.phone == phone) {
      res.statusCode = 200;
      res.json({message: "User with this phone number already exists"});
      return;
    }
  }
  res.statusCode = 200;
  res.json({message: "Phone number not found"});
});

app.get('/checkphoneValidity/:phone', (req, res) => {
  //check if mobile number is in the existing users list
  const phone = req.params.phone;
  for (var user of exisitingUsers) {
    if (user.phone == phone) {
      res.statusCode = 200;
      res.json({message: "Valid phone number"});
      return;
    }
  }
  res.statusCode = 200;
  res.json({message: "Not a valid SriTel phone number"});
});

app.post('/register', (req, res) => {
  const fname = req.body.fname;
  const lname = req.body.lname;
  const username = req.body.username;
  const email = req.body.email;
  const contact = req.body.contact;
  const password = req.body.pass;
  const address = req.body.address;
  const role = 'user';
  const id = uuid();
  const user = { id, fname, lname, username, email, contact, password, address, role };
  data.push(user);
  fs.writeFileSync('./schema/data.json', JSON.stringify(data, null, 2));
  res.statusCode = 200;
  res.json({message: "User added successfully"});
  
});

app.get('/users', (req, res) => {
  console.log('sending all the users');
  res.statusCode = 200;
  res.json({ users: data });
});

app.get('/user/:id', (req, res) => {
  console.log('sending a single user');
  const userId = req.params.id;
  for (user of data) {
    if (user.id == userId) {
      res.statusCode = 200;
      res.json({user: user});
      return;
    }
  }
  res.statusCode = 404;
  res.json({message: "User cannot be found"});
});

// create user
app.post('/user', (req, res) => {
  console.log('adding a new user');
  let userData = req.body;
  try {
    userData.id = uuid();
    data.push(user);
    fs.writeFileSync('./schema/data.json', JSON.stringify(data, null, 2));
    console.log('Data written to file');
    res.statusCode = 201;
    res.json({user: userData});
  } catch (err) {
    console.error('Error writing file', err);
    res.json({message: "Internal server error occurred"});
  }
});

app.put('/user/:id', (req, res) => {
  res.send('Hello World!');
});

app.patch('/user/:id', (req, res) => {
  console.log(req.hostname);
  res.send('Hello World!');
});

app.listen(process.env.PORT, () => {
  console.log(`Auth service started : Listening on port http://localhost:${process.env.PORT}`);
});
