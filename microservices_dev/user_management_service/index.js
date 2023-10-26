const express = require('express');
const app = express();
require('dotenv').config();
const data = require('./schema/data.json');

app.get('/', (req, res) => {
  console.log('sending all the users');
  console.log(data);
  res.send('Hello World!');
});

app.get('/users', (req, res) => {
  console.log('sending all the users');
  console.log(data);
  res.send('Hello World!');
});

app.get('/user/:id', (req, res) => {
  console.log(`Request from: ${req.hostname}`);
  console.log('sending all the users');
  res.send('Hello World!');
});

app.post('/user/:id', (req, res) => {
  console.log(req.hostname);
  res.send('Hello World!');
});

app.put('/user/:id', (req, res) => {
  console.log(req.hostname);
  res.send('Hello World!');
});

app.patch('/user/:id', (req, res) => {
  console.log(req.hostname);
  res.send('Hello World!');
});

app.listen(process.env.PORT, () => {
  console.log(`Listening on port http://localhost:${process.env.PORT}`);
});
