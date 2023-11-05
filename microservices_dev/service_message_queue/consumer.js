const amqp = require("amqplib");
const e = require("express");
require("dotenv").config();

class Consumer {
  connection = undefined;
  channel = undefined;
  queue = undefined;

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
        JSON.parse(msg.content.toString());
        callback(this.channel,msg);
      });
    }
  }
}

module.exports = Consumer;
