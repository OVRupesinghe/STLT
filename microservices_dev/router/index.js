const express = require('express');
const axios = require('axios');

const app = express();

app.get('/support/messages', async () => {
  // the for logic getting the chat messages goes here
});

app.post('/login', async () => {
  // the login logic goes here
});

app.post('/register', async () => {
  // the registration logic goes here
});

app.listen(process.env.PORT, () => {
  console.log(`Listening on http://localhost:${process.env.PORT}`)
});
