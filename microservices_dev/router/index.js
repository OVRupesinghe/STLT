const express = require("express");
const axios = require("axios");
require("dotenv").config();
const cors = require("cors");

const app = express();

// Enable CORS for all routes or specific routes

const corsOptions = {
  origin: "http://localhost:3000",
  methods: "GET,POST", // Add any other HTTP methods you need
  credentials: true, // Allow cookies and authentication headers
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/users", async (req, res) => {
  try {
    let response = await axios.get(
      `http://localhost:${process.env.SERVICE_REGISTRY_PORT}/services/authenticationService`
    );
    let data = await response.data;
    if (data) {
      let intermediateResponse = await axios.get(
        `http://${data.serviceInfo.host}:${data.serviceInfo.port}/users`
      );
      let intermediateData = await intermediateResponse.data;
      res.json(intermediateData.users);
    } else {
      res.statusCode = 500;
      res.json({ message: "An internal server error occurred" });
    }
  } catch (error) {
    console.log(error);
  }
});

app.post("/register", (req, res) => {});

app.post("/login", async (req, res) => {
  const { username, pass } = req.body;
  try {
    let response = await axios.get(
      `http://localhost:${process.env.SERVICE_REGISTRY_PORT}/services/authenticationService`
    );
    let data = await response.data;

    if (data) {
      try {
        let intermediateResponse = await axios.post(
          `http://${data.serviceInfo.host}:${data.serviceInfo.port}/login`,
          {
            username,
            pass,
          }
        );
        // access token
        // refresh token => cookie
        let intermediateData = await intermediaResponse.data;
        console.log(intermediateData);
        res.json(intermediateData);
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
  console.log(
    "Router service started : ",
    `Listening on http://localhost:${process.env.PORT}`
  );
});
