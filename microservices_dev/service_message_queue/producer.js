const amqp = require("amqplib");
require("dotenv").config();

class Producer {
  connection;
  channel;

  /**
   * The setup function will establish the connection and will create the channel
   * that is required to connect to a queue
   */
  async setup() {
    if (this.connection == undefined && this.channel == undefined) {
      this.connection = await amqp.connect(process.env.MESSAGING_SERVER_URL);
      this.channel = await this.connection.createChannel();
    }
  }

  /**
   *
   * @param {String} exchangeName the name of the exchange the client wants to connect to
   * @param {String} typeOfExchange the type of the exchange the client wants to connect to
   * @param {String} queueName the name of the queue the message should be send to
   * @param {Object} msg the actual message to be sent
   * @param {Object} options the object which defines the options related to the request-reply model
   */
  async produceToQueue(exchangeName, typeOfExchange, queueName, msg, options) {
    if (this.connection == undefined && this.channel == undefined) {
      this.connection = await amqp.connect(process.env.MESSAGING_SERVER_URL);
      this.channel = await this.connection.createChannel();
    }
    if (this.connection && this.channel) {
      await this.channel.assertExchange(exchangeName, typeOfExchange);
      msg.routeDateTimeStamp = new Date(); // added this field for testing
      // sending the message to the queue
      this.channel.sendToQueue(
        queueName,
        Buffer.from(JSON.stringify(msg)),
        options
      );
      console.log(
        `The message is routed to ${queueName} from ${exchangeName} exchange`
      );
    }
  }

  async produceToExchangeWithRoute(
    exchangeName,
    typeOfExchange,
    routingKey,
    msg
  ) {
    if (this.connection == undefined && this.channel == undefined) {
      this.connection = await amqp.connect(process.env.MESSAGING_SERVER_URL);
      this.channel = await this.connection.createChannel();
    }
    if (this.connection && this.channel) {
      await this.channel.assertExchange(exchangeName, typeOfExchange);
      msg.routeDateTimeStamp = new Date(); // added this field for testing
      // sending the message to the queue
      await this.channel.publish(
        exchangeName,
        routingKey,
        Buffer.from(JSON.stringify(msg))
      );
      console.log(
        `The message is routed to ${queueName} from ${exchangeName} exchange`
      );
    }
  }
}

module.exports = Producer;
