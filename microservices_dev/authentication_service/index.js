const express = require("express");
const app = express();
require("dotenv").config();
const data = require("./schema/data.json");
const users = require("./schema/users.json");
const fs = require("fs");
const { v4: uuid } = require("uuid");
const cors = require("cors");
const Consumer = require("../service_message_queue/consumer"); // Import the Consumer class
const Producer = require("../service_message_queue/producer");


// Create an instance of the Consumer class
const consumer = new Consumer();
const producer = new Producer();

app.use(express.json());

app.post("/login", (req, res) => {
  const { username, pass } = req.body;

  for (var user of users) {
    if (user.username === username && user.password === pass) {
      res.statusCode = 200;
      const userId = user.id;
      const userrole = user.role;
      res.json({ message: "Login successful", userId, userrole });
      // refresh token
      // access token
      return;
    }
  }
  res.statusCode = 401;
  res.json({ message: "Login failed" });
});

app.post("/register", (req, res) => {
  // add the logic here
});

app.get("/users", (req, res) => {
  console.log("sending all the users");
  res.statusCode = 200;
  res.json({ users: data });
});

app.get("/user/:id", (req, res) => {
  console.log("sending a single user");
  const userId = req.params.id;
  for (user of data) {
    if (user.id == userId) {
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
