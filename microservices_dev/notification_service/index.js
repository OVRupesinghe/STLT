const Consumer = require('../service_message_queue/consumer');

const consumer = new Consumer();
consumer.setup('alerts-exchange', 'direct', 'notification-queue', 'notices');
consumer.consume((data) => {
    console.log(data);
});