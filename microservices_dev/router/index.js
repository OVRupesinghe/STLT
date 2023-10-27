const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();

app.get('/users', async (req, res) => {
  try {
    let response = await axios.get(`http://localhost:${process.env.SERVICE_REGISTRY_PORT}/services/authenticationService`);
    let data = await response.data;
    if (data) {
      let intermediaResponse = await axios.get(`http://${data.serviceInfo.host}:${data.serviceInfo.port}/users`);
      let intermediaData = await intermediaResponse.data;
      res.json(intermediaData.users);
    } else {
      res.statusCode = 500;
      res.json({ message: "An internal server error occurred" });
    }
  } catch (error) {
    console.log(error);
  }
});

app.post('/register', (req, res) => {
});

app.post('/login', (req, res) => {
});

app.listen(process.env.PORT, () => {
  console.log(`Listening on http://localhost:${process.env.PORT}`)
});
