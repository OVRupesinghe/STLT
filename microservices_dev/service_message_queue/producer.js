const amqp = require('amqplib');
require('dotenv').config();

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
       * produce function is responsible for routing messages to the consumers, that are connected to the queues
       * attributes required to function.
       * @var exchangeName - indicates the exchange that the producer want to connect
       * @var typeOfExchange - producer should mention the type of exchange the producer will join
       * @var routingKey - this will be used to route the incoming message to the proper consumer
       * 
       * Connect to the proper consumer's exchange otherwise they want receive the data.
       * The routingKey is used to mention the route that a message should be sent in order to
       * reach the consumer
      */
    async produce(exchangeName, typeOfExchange, routingKey, msg) {
        if (this.connection && this.channel) {
            await this.channel.assertExchange(exchangeName, typeOfExchange);
            msg.routeDateTimeStamp = new Date(); // added this field for testing
            await this.channel.publish(
                exchangeName,
                routingKey,
                Buffer.from(
                    JSON.stringify(msg)
                )
            );
            console.log(`The msg ${msg} is routed to ${routingKey} from ${exchangeName} exchange`);
        }
    }
}

module.exports = Producer;