const Consumer = require("../service_message_queue/consumer"); // Import the Consumer class

// Create an instance of the Consumer class
const consumer = new Consumer();

// Set up the consumer
async function setupConsumer() {
  try {
    // Set up the consumer to listen to the same exchange and routing key
    await consumer.setup("my_exchange", "direct", "my_queue", "my_routing_key");
    console.log(
      "Consumer is connected, channel is created, and queue is bound."
    );
  } catch (error) {
    console.error("Error setting up consumer:", error);
  }
}

setupConsumer();

// Define a callback function to handle incoming messages
function handleMessage(message) {
  console.log("Received message:", message);
}

// Start consuming messages
setInterval(() => consumer.consume(handleMessage), 1000);
