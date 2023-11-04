const queueHandler = require("../service_message_queue/queuehandler");

function handleMessage(message) {
    // Process the received message here
    console.log("Handling message:", message);
}

queueHandler.consumeFromQueue("MiddlewareQueue", handleMessage);
