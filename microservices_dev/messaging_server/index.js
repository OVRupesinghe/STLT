const Producer = require("../service_message_queue/producer"); // Import the Producer class

// Create an instance of the Producer class
const producer = new Producer();

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

// Example message to send
const message = {
  text: "Hi Ho, Silver!",
};

// Send the message to an exchange with a routing key
setInterval(() => {
  producer.produce("my_exchange", "direct", "my_routing_key", message);
}, 1000);
