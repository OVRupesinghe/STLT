const express = require("express");
const app = express();
require("dotenv").config();
const fs = require("fs");
const { v4: uuid } = require("uuid");
const cors = require("cors");
const Consumer = require("../service_message_queue/consumer"); // Import the Consumer class
const Producer = require("../service_message_queue/producer");
const data = require("./schema/data.json");
const exisitingUsers = require("./schema/existing_users.json");
const jwt = require("jsonwebtoken");
const {sendMail} = require('./authMessenger');

// Create an instance of the Consumer class
const consumer = new Consumer();
const producer = new Producer();

app.use(express.json());

app.post("/login", (req, res) => {
  const { username, pass } = req.body;

  for (var user of data) {
    if (user.username === username && user.password === pass) {
      res.statusCode = 200;
      const userId = user.id;
      const userrole = user.role;
      const payload = {
        userId: userId,
        phone: user.phone,
        userrole: userrole,
      };
      const secretKey = process.env.JWT_TOKEN_SECRET; // Replace with a strong secret key for signing the token
      const accessToken = jwt.sign(payload, secretKey, { expiresIn: "15m" }); // Access token expires in 1 hour
      const refreshToken = jwt.sign(payload, secretKey, { expiresIn: "7d" }); // Refresh token expires in 1 day
      for (var i = 0; i < data.length; i++) {
        if (data[i].id === userId) {
          data[i].refreshToken = refreshToken;
          break;
        }
      }
      // Write the updated data back to the JSON file
      fs.writeFileSync("./schema/data.json", JSON.stringify(data, null, 2));
      res.json({ accessToken, refreshToken, userrole });
      return;
    }
  }
  res.statusCode = 401;
  res.json({ message: "Login failed" });
});

app.post("/logout", (req, res) => {

  const { refreshToken } = req.body;
  for (var i = 0; i < data.length; i++) {
    if (data[i].refreshToken === refreshToken) {
      data[i].refreshToken = "";
      fs.writeFileSync("./schema/data.json", JSON.stringify(data, null, 2));
      res.statusCode = 200;
      res.json({ message: "Logout successful" });
      return;
    }
  }
  res.statusCode = 401;
  res.json({ message: "Logout failed" });
});

app.post("/changePassword", (req, res) => {
  const { phone, pass } = req.body;

  //find the user with the phone number and update the password and write back to the json file
  for (var user of data) {
    if (user.phone === phone) {
      user.password = pass;
      fs.writeFileSync("./schema/data.json", JSON.stringify(data, null, 2));
      res.statusCode = 200;
      res.json({ message: "Password changed successfully" });
      return;
    }
  }
  res.statusCode = 401;
  res.json({ message: "Password change failed" });
});

app.post("/forgotPassword", (req, res) => {
  const { email } = req.body;
  for (var user of data) {
    if (user.email === email) {
      const resetToken = uuid();
      const userId = user.id;
      user.resetToken = resetToken;
      fs.writeFileSync("./schema/data.json", JSON.stringify(data, null, 2));
      //send email with the reset token
      sendMail(email, resetToken, userId);
      res.statusCode = 200;
      res.json({ message: "Reset token sent to email" });
      return;
    }
  }
  res.statusCode = 401;
  res.json({ message: "Reset token sending failed" });
});



app.get("/checkRefreshToken/:refreshToken", (req, res) => {
//return user id with the token
  const refreshToken = req.params.refreshToken;
  for (var user of data) {
    if (user.refreshToken === refreshToken) {
      res.statusCode = 200;
      res.json({ message: "Valid refresh token", phone: user.phone, userId: user.id });
      return;
    }
  }
  res.statusCode = 403;
  res.json({ message: "Invalid refresh token", userId: null });
});

//function to check whether username already exists
app.get("/checkusername/:username", (req, res) => {
  const username = req.params.username;
  for (var user of data) {
    if (user.username == username) {
      res.statusCode = 200;
      //return user id
      res.json({ message: "Username already exists" });
      return;
    }
  }
  res.statusCode = 200;
  res.json({ message: "Username not found" });
});

app.get("/checkemail/:email", (req, res) => {
  const email = req.params.email;
  for (var user of data) {
    if (user.email == email) {
      res.statusCode = 200;
      res.json({ message: "User with this email already exists" });
      return;
    }
  }
  res.statusCode = 200;
  res.json({ message: "Email not found" });
});

app.get("/checkphone/:phone", (req, res) => {
  const phone = req.params.phone;
  for (var user of data) {
    if (user.phone == phone) {
      res.statusCode = 200;
      res.json({ message: "User with this phone number already exists" });
      return;
    }
  }
  res.statusCode = 200;
  res.json({ message: "Phone number not found" });
});

app.get("/checkphoneValidity/:phone", (req, res) => {
  //check if mobile number is in the existing users list
  const phone = req.params.phone;
  for (var user of exisitingUsers) {
    if (user.phone == phone) {
      res.statusCode = 200;
      res.json({ message: "Valid phone number" });
      return;
    }
  }
  res.statusCode = 200;
  res.json({ message: "Not a valid SriTel phone number" });
});

app.post("/register", (req, res) => {
  const fname = req.body.fname;
  const lname = req.body.lname;
  const username = req.body.username;
  const email = req.body.email;
  const phone = req.body.contact;
  const password = req.body.pass;
  const address = req.body.address;
  const role = "user";
  const refreshToken = "";
  const resetToken = "";
  const id = uuid();
  const user = {
    id,
    fname,
    lname,
    username,
    email,
    phone,
    password,
    address,
    role,
    refreshToken,
    resetToken,
  };
  data.push(user);
  fs.writeFileSync("./schema/data.json", JSON.stringify(data, null, 2));
  res.statusCode = 200;
  res.json({ message: "User added successfully" });
});

app.get("/users", (req, res) => {
  console.log("sending all the users");
  res.statusCode = 200;
  res.json({ users: data });
});

app.get("/user/:id", (req, res) => {
  console.log("sending a single user");
  const phone = req.params.id;
  for (user of data) {
    if (user.phone == phone) {
      res.statusCode = 200;
      res.json({ user: user });
      return;
    }
  }
  res.statusCode = 404;
  res.json({ message: "User cannot be found" });
});

// create user
app.post("/user", (req, res) => {
  console.log("adding a new user");
  let userData = req.body;
  try {
    userData.id = uuid();
    data.push(user);
    fs.writeFileSync("./schema/data.json", JSON.stringify(data, null, 2));
    console.log("Data written to file");
    res.statusCode = 201;
    res.json({ user: userData });
  } catch (err) {
    console.error("Error writing file", err);
    res.json({ message: "Internal server error occurred" });
  }
});

app.put("/user/:id", (req, res) => {
  res.send("Hello World!");
});

app.patch("/user/:id", (req, res) => {
  console.log(req.hostname);
  res.send("Hello World!");
});

app.listen(process.env.PORT, () => {
  console.log(
    `Auth service started : Listening on port http://localhost:${process.env.PORT}`
  );
});


async function setupConsumer() {
  try {
    // Set up the consumer to listen to the same exchange and routing key
    await consumer.setup("ROUTER", "direct", "AUTHENTICATE", "AUTHENTICATE");
    // Set up the consumer to listen to the same exchange and routing key

    // Define a callback function to handle incoming messages
    const handleMessage = async (channel, message) => {
      channel.ack(message); // acknowledge the message was received
      // console.log(JSON.parse(message.content.toString()));
      const { correlationId, replyTo } = message.properties;

      console.log("sending a single user");
      const userId = JSON.parse(message.content.toString()).userId;

      let response = {}; 
      for (user of data) {
        if (user.id == userId) {
          response = { statusCode:200,user: user };
          
          producer.produceToQueue(
            "ROUTER",
            "direct",
            replyTo,
            response,
            {
              correlationId: correlationId,
            }
          );
          return;
        }
      }

      response = { statusCode:404, message: "User cannot be found" };
      producer.produceToQueue(
        "ROUTER",
        "direct",
        replyTo,
        response,
        {
          correlationId: message.properties.correlationId,
        }
      );
    };
    await consumer.consume(handleMessage);
  } catch (error) {
    console.error("Error setting up consumer:", error);
  }
}

async function setupProducer() {
  try {
    // Set up the consumer to listen to the same exchange and routing key
    await producer.setup();
  } catch (error) {
    console.error("Error setting up consumer:", error);
  }
}

setupProducer();
setupConsumer();
