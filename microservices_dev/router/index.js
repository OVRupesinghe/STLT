const express = require('express');
const axios = require('axios');
require('dotenv').config();
const cors = require('cors'); 

const app = express();

// Enable CORS for all routes or specific routes

const corsOptions = {
  origin: 'http://localhost:3000',
  methods: 'GET,POST', // Add any other HTTP methods you need
  credentials: true,   // Allow cookies and authentication headers
};

app.use(cors(corsOptions));
app.use(express.json());

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

app.post('/login', async (req, res) => {
  const { username, pass } = req.body;
  try {
    let response = await axios.get(`http://localhost:${process.env.SERVICE_REGISTRY_PORT}/services/authenticationService`);
    let data = await response.data;
 
    if (data) {
      try {
        let intermediaResponse = await axios.post(`http://${data.serviceInfo.host}:${data.serviceInfo.port}/login`, {
          username,
          pass
        });
        let intermediaData = await intermediaResponse.data;
        res.json(intermediaData);
      } catch (error) {
        res.statusCode = 401;
        res.json(error.response.data);
      }
      
    } else {
      res.statusCode = 500;
      res.json({ message: "An internal server error occurred" });
    }
  } catch (error) {
    console.log(error);
  }
});

app.post('/register', async (req, res) => {
  const user_data = req.body;
  try {
    let response = await axios.get(`http://localhost:${process.env.SERVICE_REGISTRY_PORT}/services/authenticationService`);
    let data = await response.data;
 
    if (data) {
      try {
        let intermediaResponse = await axios.post(`http://${data.serviceInfo.host}:${data.serviceInfo.port}/register`,user_data);
        let intermediaData = await intermediaResponse.data;
        res.json(intermediaData);
      } catch (error) {
        res.statusCode = 401;
        res.json(error.response.data);
      }
      
    } else {
      res.statusCode = 500;
      res.json({ message: "An internal server error occurred" });
    }
  } catch (error) {
    console.log(error);
  }
});



app.get('/checkusername/:username', async (req, res) => {

  const username = req.params.username;
  try {
    let response = await axios.get(`http://localhost:${process.env.SERVICE_REGISTRY_PORT}/services/authenticationService`);
    let data = await response.data;
 
    if (data) {
      try {
        let intermediaResponse = await axios.get(`http://${data.serviceInfo.host}:${data.serviceInfo.port}/checkusername/${username}`);
        let intermediaData = await intermediaResponse.data;
        res.json(intermediaData);
      } catch (error) {
        res.statusCode = 401;
        res.json(error.response.data);
      }
      
    } else {
      res.statusCode = 500;
      res.json({ message: "An internal server error occurred" });
    }
  } catch (error) {
    console.log(error);
  }
});

app.get('/checkemail/:email', async (req, res) => {

  const email = req.params.email;
  try {
    let response = await axios.get(`http://localhost:${process.env.SERVICE_REGISTRY_PORT}/services/authenticationService`);
    let data = await response.data;
 
    if (data) {
      try {
        let intermediaResponse = await axios.get(`http://${data.serviceInfo.host}:${data.serviceInfo.port}/checkemail/${email}`);
        let intermediaData = await intermediaResponse.data;
        res.json(intermediaData);
      } catch (error) {
        res.statusCode = 401;
        res.json(error.response.data);
      }
      
    } else {
      res.statusCode = 500;
      res.json({ message: "An internal server error occurred" });
    }
  } catch (error) {
    console.log(error);
  }
});


app.get('/checkphone/:phone', async (req, res) => {

  const phone = req.params.phone;
  try {
    let response = await axios.get(`http://localhost:${process.env.SERVICE_REGISTRY_PORT}/services/authenticationService`);
    let data = await response.data;
 
    if (data) {
      try {
        let intermediaResponse = await axios.get(`http://${data.serviceInfo.host}:${data.serviceInfo.port}/checkphone/${phone}`);
        let intermediaData = await intermediaResponse.data;
        res.json(intermediaData);
      } catch (error) {
        res.statusCode = 401;
        res.json(error.response.data);
      }
      
    } else {
      res.statusCode = 500;
      res.json({ message: "An internal server error occurred" });
    }
  } catch (error) {
    console.log(error);
  }
});

app.get('/checkphoneValidity/:phone', async (req, res) => {

  const phone = req.params.phone;
  try {
    let response = await axios.get(`http://localhost:${process.env.SERVICE_REGISTRY_PORT}/services/authenticationService`);
    let data = await response.data;
 
    if (data) {
      try {
        let intermediaResponse = await axios.get(`http://${data.serviceInfo.host}:${data.serviceInfo.port}/checkphoneValidity/${phone}`);
        let intermediaData = await intermediaResponse.data;
        res.json(intermediaData);
      } catch (error) {
        res.statusCode = 401;
        res.json(error.response.data);
      }
      
    } else {
      res.statusCode = 500;
      res.json({ message: "An internal server error occurred" });
    }
  } catch (error) {
    console.log(error);
  }
});



app.listen(process.env.PORT, () => {
  console.log('Router service started : ',`Listening on http://localhost:${process.env.PORT}`)
});
