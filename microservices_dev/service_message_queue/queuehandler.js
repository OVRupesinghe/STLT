const amqp = require('amqplib/callback_api');

let connection = null;
let channel = null;

function createConnectionAndChannel(callback) {
    amqp.connect('amqp://localhost', (error, conn) => {
        if (error) {
            console.error('Error creating connection:', error);
            return;
        }

        connection = conn;

        connection.createChannel((channelError, ch) => {
            if (channelError) {
                console.error('Error creating channel:', channelError);
                return;
            }

            channel = ch;
            console.log('Connection and channel established');

            if (callback) {
                callback();
            }
        });
    });
}

const publishToQueue = (queueName, message) => {
    channel.assertQueue(queueName, {
        durable: true
    });

    channel.sendToQueue(queueName, Buffer.from(message), {
        persistent: true
    });

    console.log(" [x] Sent '%s'", message);
}

const consumeFromQueue = (queueName, callback) => {
    createConnectionAndChannel(() => {
        channel.assertQueue(queueName, {
            durable: true
        });

        channel.consume(queueName, (msg) => {
            if (msg) {
                const msgContent = JSON.parse(msg.content.toString()); // Assuming message is JSON

                console.log("Received message:", msgContent);

                if (callback) {
                    callback(msgContent);
                }

                // Acknowledge the message
                channel.ack(msg);
            }
        }, {
            noAck: false
        });
    });
}

const sendAck = (deliveryTag) => {
    const deliveryTagInt = parseInt(deliveryTag);
    channel.ack({ fields: { deliveryTag: deliveryTagInt } });
    console.log('Acknowledgement sent');
}

process.on('exit', () => {
    if (connection) {
        connection.close();
        console.log('Connection closed');
    }
});

module.exports = {
    publishToQueue,
    consumeFromQueue,
    sendAck,
    createConnectionAndChannel
}