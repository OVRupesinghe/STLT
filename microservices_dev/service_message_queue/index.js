const SocketIO = require('socket.io');
const http = require('http');
const express = require('express');
const MessageQueue = require('./message-queue');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = SocketIO(server);
const messageQueue = new MessageQueue();

/**
 * Message format => 
 * {
 *    type: "publish" | "subscribe",
 *    queueName: "NAME_OF_THE_QUEUE",
 *    callback | message: 
 * }
 *
 * if the type is publish then there should be a message field,
 * otherwise there should be a callback field with a function
  */

io.on('connection', (client) => {
  console.log('Inbound connection.');
  client.on('message', (message) => {
    if (message.type == 'publish') {
    } else if (message.type == 'subscribe') {
    } else {
    }
  });
});


server.listen(process.env.PORT, '127.0.0.0');
