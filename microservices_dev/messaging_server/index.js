const express = require('express');
const app = express();
const queueHandler = require("../service_message_queue/queuehandler");

// Define an Express route that handles a specific HTTP request
app.get('/message', (req, res) => {
    // Your code here
    queueHandler.createConnectionAndChannel(() => {
        queueHandler.publishToQueue(
            "MiddlewareQueue",
            JSON.stringify({ message: "Hello Putha!" })
        );
    });

    res.json({
        message: "Violation added to the database and video successfully uploaded",
    });
});

// Start the Express app and listen on a port
const port = 2999;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});