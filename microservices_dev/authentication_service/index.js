const express = require('express');
const app = express();
require('dotenv').config();
const data = require('./schema/data.json');
const users = require('./schema/users.json');
const fs = require('fs');
const {v4: uuid } = require('uuid');
const cors = require('cors'); 

app.use(express.json());

app.post('/login', (req, res) => {
 
  const { username, pass } = req.body;

  for (var user of users) {
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

app.post('/register', (req, res) => {
  // add the logic here
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
