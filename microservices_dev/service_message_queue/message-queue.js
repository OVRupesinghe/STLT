const { EventEmitter } = require('events');

// This is a very simple message queue Server
// No additional checks are added to keep it simple
// Normally there should be a mechanism for autheticating
// incoming services to validate them

class MessageQueue extends EventEmitter {
  constructor() {
    super();
    this.subscribers = {}; // initialize the subscriber queues
    this.messages = {}; // initialize the message queues
  }
  
  // publishing a message to a particular queue
  publish(queue, message) {
    // if the queue doesn't exist create it
    if (!this.messages[queue]) {
      this.messages[queue] = [];
    }

    if (!this.subscribers[queue]) {
      this.subscribers[queue] = [];
    }

    this.messages[queue].push(message);

    // emit a 'message' event for he queue
    this.emit('message', queue, message);
  }

  // services can subscribe to queues
  subscribe(queue, callback) {
    if (!this.subscribers[queue]) {
      this.subscribers[queue] = [];
    } 

    if (!this.messages[queue]) {
      this.messages[queue] = [];
    }

    this.subscribers[queue].push(callback);

    // emit a 'subscribe' event for the queue
    this.emit('subscribe', queue, callback);
  }

  // consume a message from a queue
  consume(message, callback) {
    if (message) {
      callback(message);
    } else {
      callback(null);
    }
  }
}

module.exports = MessageQueue;
