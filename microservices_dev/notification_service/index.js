const Consumer = require("../service_message_queue/consumer"); // Import the Consumer class
const Producer = require("../service_message_queue/producer");
const { v4: uuid } = require("uuid");

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
    const handleMessage = async(channel,message) => {
      
      const msg = JSON.parse(message.content.toString());
      const { correlationId, replyTo } = message.properties;
      // console.log(message.properties);
      // console.log(msg);
      if (msg.type) {
        switch (msg.type) {
          case "EMAIL":
            {

              // Set up the consumer
              const authenticateConsumer = new Consumer();
              await authenticateConsumer.setup("ROUTER", "direct", "NOTIFICATION_AUTHENTICATE", "NOTIFICATION_AUTHENTICATE");
              const handleMessage = (channel,authenticateMsg) => {
                  channel.ack(authenticateMsg); // acknowledge the message was received
                  // console.log(JSON.parse(authenticateMsg.content.toString()));
                  
                  const {statusCode, user, message} = JSON.parse(authenticateMsg.content.toString());

                  let response = {};
                  if(statusCode == 404) {
                    console.log("User cannot be found");
                    console.log("failed to send email");
                    response = { statusCode:404, message: message };
                  }
                  else{
                      // logic for sending an email for now will be console logging
                      // log the request and the state
                      console.log({
                        type: "EMAIL",
                        message: msg.message,
                        from: msg.from,
                        to: user.email, //TODO: Authenticate doesn't provide email yet
                      });
                      response = {
                        message: "STATUS: SUCCESS - 200",
                        messageType: "EMAIL",
                      }
                  }

                  producer.produceToQueue(
                    "ROUTER",
                    "direct",
                    replyTo,
                    {
                      ...response
                    },
                    {
                      correlationId: correlationId,
                    }
                  );
              };
              
              authenticateConsumer.consume(handleMessage);

              const getEmailProducer = prepareForGetEmail();

              getEmailProducer.produceToQueue(
                  "ROUTER",
                  "direct",
                  "AUTHENTICATE",
                  { userId: msg.to, time: new Date().getTime() },
                  {
                    replyTo: "NOTIFICATION_AUTHENTICATE",
                    correlationId: uuid(),
                  }
              );

            }
            break;
          case "SMS":
            {
              // logic for sending an email for now will be console logging
              // log the request and the state
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
        channel.ack(message); // acknowledge the message was received
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


const prepareForGetEmail = () => {
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

  return producer;
}
