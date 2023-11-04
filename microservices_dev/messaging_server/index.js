const Producer = require('../service_message_queue/producer');

const producer = new Producer();
producer.setup();
producer.produce('alerts-exchange', 'direct', 'notices', { message: "Hello, world" });
