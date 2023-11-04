const amqp = require("amqplib");
const e = require("express");
require("dotenv").config();

class Consumer {
  connection = undefined;
  channel = undefined;
  queue = undefined;

  /**
   * Setup function is responsible for creating and initializing the consumer
   * attributes required to function.
   * @var exchangeName - indicates the exchange that the consumer want to connect
   * @var typeOfExchange - consumer should mention the type of exchange that they will join
   * @var queueName - the name that should be given to the queue
   * @var routingKey - this will be used to route the incoming message to the proper consumer
   *
   * Connect to the proper producer's exchange otherwise you want receive the data.
   * The routingKey is used to mention the route that a message should be sent in order to
   * reach the consumer
   */
  async setup(exchangeName, typeOfExchange, queueName, routingKey) {
    try {
      if (
        this.connection == undefined &&
        this.channel == undefined &&
        this.queue == undefined
      ) {
        this.connection = await amqp.connect(process.env.MESSAGING_SERVER_URL);
        this.channel = await this.connection.createChannel();
        await this.channel.assertExchange(exchangeName, typeOfExchange);
        this.queue = await this.channel.assertQueue(queueName);
        await this.channel.bindQueue(
          this.queue.queue,
          exchangeName,
          routingKey
        );
      }
    } catch (error) {
      console.error(error);
      process.exit();
    }
  }

  /**
   * This function can be used to consume a messages in the queue
   * Assumptions: All the messages passed are JSON and NO OTHER FORMAT
   * IS USED.
   *
   * AND THE INCOMING MESSAGE FORMAT IS PREVIOUSLY KNOWN BY THE PARTY USING
   * THE CONSUMER CLASS.
   *
   * @var callback - the function that will be called to handle the data
   * @returns an object with the message data
   */
  async consume(callback) {
    if (this.connection && this.channel && this.queue) {
      await this.channel.consume(this.queue.queue, (msg) => {
        callback(JSON.parse(msg.content.toString()));
        this.channel.ack(msg);
      });
    }
  }
}

module.exports = Consumer;
