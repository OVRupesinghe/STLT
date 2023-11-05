const Consumer = require("../service_message_queue/consumer"); // Import the Consumer class
const Producer = require("../service_message_queue/producer");

// Create an instance of the Consumer class
const consumer = new Consumer();
const producer = new Producer();

// Set up the consumer
async function setupConsumer() {
  try {
    // Set up the consumer to listen to the same exchange and routing key
    await consumer.setup("ROUTER", "direct", "NOTICES", "NOTIFY");
    // Define a callback function to handle incoming messages
    /**
     * The message should use the following format
     * And use only EMAIL as the type for now
     * {
     *    "type": "EMAIL"|"SMS",
     *    "from": "EMAIL or PHONE NUMBER OF THE SENDER"
     *    "to": "EMAIL or PHONE NUMBER OF THE RECEIVER"
     *    "message": "CONTENT OF THE MESSAGE",
     * }
     */
    const handleMessage = (message) => {
      const msg = JSON.parse(message.content.toString());
      console.log(message.properties);
      console.log(msg);
      if (msg.type) {
        switch (msg.type) {
          case "EMAIL":
            {
              // logic for sending an email for now will be console logging
              // log the request and the state
              const { correlationId, replyTo } = message.properties;
              console.log({
                type: "EMAIL",
                message: msg.message,
                from: msg.from,
                to: msg.to,
              });
              producer.produceToQueue(
                "ROUTER",
                "direct",
                replyTo,
                {
                  message: "STATUS: SUCCESS - 200",
                  messageType: "EMAIL",
                },
                {
                  correlationId: correlationId,
                }
              );
            }
            break;
          case "SMS":
            {
              // logic for sending an email for now will be console logging
              // log the request and the state
              const { correlationId, replyTo } = message.properties;
              console.log({
                type: "SMS",
                message: msg.message,
                from: msg.from,
                to: msg.to,
              });
              producer.produceToQueue(
                "ROUTER",
                "direct",
                replyTo,
                {
                  message: "STATUS: SUCCESS - 200",
                  messageType: "SMS",
                },
                {
                  correlationId: correlationId,
                }
              );
            }
            break;
          default: {
            const { correlationId, replyTo } = message.properties;
            console.log("Invalid message type...");
            producer.produceToQueue(
              "ROUTER",
              "direct",
              replyTo,
              {
                message: "STATUS: ERROR - 422",
                messageType: "INVALID",
              },
              {
                correlationId: correlationId,
              }
            );
          }
        }
      }
    };
    consumer.consume(handleMessage);
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
