const express = require("express");
const axios = require("axios");
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();

// Enable CORS for all routes or specific routes

const corsOptions = {
  origin: "http://localhost:3000",
  methods: "GET,POST", // Add any other HTTP methods you need
  credentials: true, // Allow cookies and authentication headers
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.get("/users", async (req, res) => {
  try {
    let response = await axios.get(
      `http://localhost:${process.env.SERVICE_REGISTRY_PORT}/services/authenticationService`
    );
    let data = await response.data;
    if (data) {
      let intermediaResponse = await axios.get(
        `http://${data.serviceInfo.host}:${data.serviceInfo.port}/users`
      );
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

app.get("/user/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    let response = await axios.get(
      `http://localhost:${process.env.SERVICE_REGISTRY_PORT}/services/authenticationService`
    );
    let data = await response.data;
    if (data) {
      let intermediaResponse = await axios.get(
        `http://${data.serviceInfo.host}:${data.serviceInfo.port}/user/${userId}`
      );
      let intermediaData = await intermediaResponse.data;
      res.json(intermediaData.user);
    } else {
      res.statusCode = 500;
      res.json({ message: "An internal server error occurred" });
    }
  } catch (error) {
    console.log(error);
  }
});

app.post("/login", async (req, res) => {
  const { username, pass } = req.body;
  try {
    let response = await axios.get(
      `http://localhost:${process.env.SERVICE_REGISTRY_PORT}/services/authenticationService`
    );
    let data = await response.data;

    if (data) {
      try {
        let intermediaResponse = await axios.post(
          `http://${data.serviceInfo.host}:${data.serviceInfo.port}/login`,
          {
            username,
            pass,
          }
        );
        let intermediaData = await intermediaResponse.data;
        res.cookie("jwt", intermediaData.refreshToken, {
          httpOnly: true,
          sameSite: "none",
          secure: true,
          maxAge: 24 * 60 * 60 * 1000,
        });
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

app.post("/register", async (req, res) => {
  const user_data = req.body;
  try {
    let response = await axios.get(
      `http://localhost:${process.env.SERVICE_REGISTRY_PORT}/services/authenticationService`
    );
    let data = await response.data;

    if (data) {
      try {
        let intermediaResponse = await axios.post(
          `http://${data.serviceInfo.host}:${data.serviceInfo.port}/register`,
          user_data
        );
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

app.get("/refresh", async (req, res) => {
  const cookies = req.cookies;
  try {
    if (!cookies?.jwt) return res.sendStatus(401);
    const refreshToken = cookies.jwt;
    try {
      let response = await axios.get(
        `http://localhost:${process.env.SERVICE_REGISTRY_PORT}/services/authenticationService`
      );
      let data = await response.data;
      if (data) {
        try {
          let intermediaResponse = await axios.get(
            `http://${data.serviceInfo.host}:${data.serviceInfo.port}/checkRefreshToken/${refreshToken}`
          );
          let intermediaData = await intermediaResponse.data;
          const userrole = "user";
          const phone = intermediaData.phone;
         
          // User is authenticated. Generate a JWT token with user information.
          const payload = {
            phone: phone,
            userrole: userrole,
          };
     
          jwt.verify(
            refreshToken,
            process.env.JWT_TOKEN_SECRET,
            (err,tokenData) =>{
              if(err || phone != tokenData.phone) return res.sendStatus(403);
              const accessToken = jwt.sign(
                payload,
                process.env.JWT_TOKEN_SECRET,
                { expiresIn: '15m' }
              )
              res.json({ accessToken, userrole, phone })
            }
          )
        } catch (error) {
          res.statusCode = 403;
          res.json(error);
        }
      } else {
        res.statusCode = 500;
        res.json({ message: "An internal server error occurred" });
      }
    } catch (error) {
      console.log(error);
    }
  } catch (error) {
    console.error("Error refreshing the token:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Common function to hanfle registation validations
async function checkData(req, res, endpoint, params) {
  const dataParam = params;
  try {
    const response = await axios.get(
      `http://localhost:${process.env.SERVICE_REGISTRY_PORT}/services/authenticationService`
    );
    const data = await response.data;

    if (data) {
      try {
        const intermediaResponse = await axios.get(
          `http://${data.serviceInfo.host}:${data.serviceInfo.port}/${endpoint}/${dataParam}`
        );
        const intermediaData = await intermediaResponse.data;
        res.json(intermediaData);
      } catch (error) {
        res.status(401).json(error.response.data);
      }
    } else {
      res.status(500).json({ message: "An internal server error occurred" });
    }
  } catch (error) {
    console.log(error);
  }
}

// Route handlers using the common validation function
app.get("/checkusername/:username", async (req, res) => {
  checkData(req, res, "checkusername", req.params.username);
});

app.get("/checkemail/:email", async (req, res) => {
  checkData(req, res, "checkemail", req.params.email);
});

app.get("/checkphone/:phone", async (req, res) => {
  checkData(req, res, "checkphone", req.params.phone);
});

app.get("/checkphoneValidity/:phone", async (req, res) => {
  checkData(req, res, "checkphoneValidity", req.params.phone);
});

app.listen(process.env.PORT, () => {
  console.log(
    "Router service started : ",
    `Listening on http://localhost:${process.env.PORT}`
  );
});
