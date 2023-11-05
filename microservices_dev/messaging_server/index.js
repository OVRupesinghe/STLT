const Consumer = require("../service_message_queue/consumer");
const Producer = require("../service_message_queue/producer");
const { v4: UUID } = require("uuid");
const bodyParser = require("body-parser");
const express = require("express");
const app = express();

app.use(express.json());

// Create an instance of the Producer class
const producer = new Producer();
const consumer = new Consumer();

// Set up the producer
async function setupProducer() {
  try {
    await producer.setup();
    console.log("Producer is connected and channel is created.");
  } catch (error) {
    console.error("Error setting up producer:", error);
  }
}
setupProducer();

async function setupConsumer() {
  try {
    await consumer.setup("ROUTER", "direct", "MESSAGE_REPLY", "MESSAGE_REPLY");
    const handleMessage = (channel,message) => {
      console.log(JSON.parse(message.content.toString()));
      channel.ack(message); // acknowledge the message was received
    };
    consumer.consume(handleMessage);
  } catch (error) {
    console.error("Error setting up consumer:", error);
  }
}
setupConsumer();

app.post("/message", (req, res) => {
  const message = req.body;
  producer.produceToQueue(
    "ROUTER",
    "direct",
    "NOTICES",
    { ...message, time: new Date().getTime() },
    {
      replyTo: "MESSAGE_REPLY",
      correlationId: UUID(),
    }
  );
  res.statusCode = 204;
  res.json({ message: "SUCCESSFUL" });
});

app.listen(process.env.PORT, () => {
  console.log(`listening on: http://localhost:${process.env.PORT}`);
});
