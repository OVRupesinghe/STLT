const express = require('express');
const app = express();
require('dotenv').config();
const data = require('./schema/service_users.json'); //
const fs = require('fs');
const {v4: uuid } = require('uuid');
const e = require('express');
const axios = require('axios');
const Consumer = require("../service_message_queue/consumer");
const Producer = require("../service_message_queue/producer");

app.use(express.json());

//endpoint to get all the services provided by the provision system REST API
app.get('/services', async (req, res) => {
    try {
        console.log('sending all the services');
        
        //call the provision system REST API to get all the services
        const services = await axios.get(process.env.PROVISION_SYSTEM_URL + process.env.PROVISION_SYSTEM_PORT + '/services');
        
        //return the services
        res.statusCode = 200;
        res.json(services?.data);
    } catch (error) {
        console.error(error);
        res.statusCode = error.response?.status || 500; 
        res.json({ message: error?.response?.data?.message });
    }
});

//endpoint to get all the services provided by the provision system REST API with the acitvation status of the user
app.get('/services/user/:id', async (req, res) => {
    try {
        console.log('sending all the services with activation status of the user with id: ' + req.params.id);
        
        //call the provision system REST API to get all the services
        const services = await axios.get(process.env.PROVISION_SYSTEM_URL + process.env.PROVISION_SYSTEM_PORT + '/services');

        const response = services?.data?.map(service => {
            return { id:service.id, name:service.name, description:service.description, price:service.price, status:service.users.find(user => user.id == req.params.id)?.status || 'inactive' }
        });

        //return the services
        res.statusCode = 200;
        res.json(response);
    } catch (error) {
        console.error(error);
        res.statusCode = error.response?.status || 500; 
        res.json({ message: error?.response?.data?.message });
    }
});

//endpoint to get specific the service provided by the provision system REST API
app.get('/services/:id', async (req, res) => {
    try {
        console.log('sending the service with id: ' + req.params.id);
        
        //call the provision system REST API to get all the services
        const service = await axios.get(process.env.PROVISION_SYSTEM_URL + process.env.PROVISION_SYSTEM_PORT + '/services/' + req.params.id);

        //return the services
        res.statusCode = 200;
        res.json(service.data);
    } catch (error) {
        console.error(error);
        res.statusCode = error.response.status;
        res.json({ message: error.response.data.message });
    }
});

//endpoint to activate a service for a given user id
app.post('/services/:id/activate', async (req, res) => {
    try {
        const { userId } = req.body;
        console.log('activating the service with id: ' + req.params.id + ' for the user with id: ' + userId);

        //?do we check that the user has already activated the service? or is it done by the provision system?
        
        //call the provision system REST API to activate the service
        const response = await axios.post(process.env.PROVISION_SYSTEM_URL + process.env.PROVISION_SYSTEM_PORT + '/services/' + req.params.id + '/activate', req.body);
        // console.log(response?.data);
        if(response.status == 200){
            //TODO:: add payment service call here
            //?we don't need to process the payment when the service is activated, we can do it at the end of the month
            //?we just need to send an notification to the user that the service has been activated

            //return the services
            res.statusCode = 200;
            res.json({
                message: 'Service already activated',
            });
            console.log('Service already activated');
        }
        else if(response.status == 201)
            {
                // TODO:: Need to send user email
                //?we currently don't have a user email, so we will send it to a temp email
                //?we need to store the user email in the database or else ...
                // send a message to the notification service to send an email to the user
                const {producer, consumer} =prepareForSendNotification();
                const message = {
                    type: "EMAIL",
                    message: `Your service '${response?.data?.serviceName?? ''}' has been activated`,
                    from: "provisioningService@gmail.com",
                    to: "userTemp@gmial.com",
                };
                producer.produceToQueue(
                    "ROUTER",
                    "direct",
                    "NOTICES",
                    { ...message, time: new Date().getTime() },
                    {
                    replyTo: "PROVISION_REPLY",
                    correlationId: uuid(),
                    }
                );

                res.statusCode = 201;
                res.json({
                    message: 'Service activated successfully'
                });
                console.log('Service activated successfully');
            }
        else{
            res.statusCode = 400;
            res.json({
                message: 'Service activation failed',
            });
            console.log('Service activation failed');
        }
        
    } catch (error) {
        console.error(error);
        res.statusCode = error?.response?.status;
        res.json({ message: error?.response?.data?.message });
    }
});

//endpoint to deactivate a service for a given user id
app.post('/services/:id/deactivate', async (req, res) => {
    try {
        console.log('deactivating the service with id: ' + req.params.id);

        //call the provision system REST API to deactivate the service
        const response = await axios.post(process.env.PROVISION_SYSTEM_URL + process.env.PROVISION_SYSTEM_PORT + '/services/' + req.params.id + '/deactivate', req.body);

        if(response.status == 200){
            res.statusCode = 200;
            res.json({
                message: 'Service already deactivated',
            });
            console.log('Service already deactivated');
        }
        else if(response.status == 204)
            {
                res.statusCode = 200;
                res.json({
                    message: 'Service deactivated successfully'
                });
                console.log('Service deactivated successfully');
            }
        else{
            res.statusCode = 400;
            res.json({
                message: 'Service deactivation failed',
            });
            console.log('Service deactivation failed');
        }
        
    } catch (error) {
        console.error(error);
        res.statusCode = error.response.status;
        res.json({ message: error.response.data.message });
    }
});

//endpoint to get all the users who have activated services
app.get('/services/:id/users', async (req, res) => {
    try {
        console.log('sending all the users who have activated the service with id: ' + req.params.id);

        //call the provision system REST API to get all the services with users details
        const services = await axios.get(process.env.PROVISION_SYSTEM_URL + process.env.PROVISION_SYSTEM_PORT + '/services');
        
        //users who have activated the service is in the schema/data.json file
        const users = [];

        for (service of services.data) {
            if(service.id == req.params.id){
                for(user of service.users){
                    if(user.status == 'active'){
                        users.push(user);
                    }
                }
            }
        }

        //return the services
        res.statusCode = 200;
        res.json(users);

    } catch (error) {
        console.error(error);
        res.statusCode = 500;
        res.json({ message: "Internal server error occurred" });
    }
});


//listen on the port specified in the .env file
app.listen(process.env.PORT, () => {
    console.log(`provision microservice Listening on port http://localhost:${process.env.PORT}`);
});



const prepareForSendNotification = () => {
    // Create an instance of the Producer class
    const producer = new Producer();
    const consumer = new Consumer();

    // Set up the producer
    async function setupProducer() {
        try {
        await producer.setup();
        console.log("Producer is connected and channel is created.");
        } catch (error) {
        console.error("Error setting up producer:", error);
        }
    }
    setupProducer();
    
    // Set up the consumer
    async function setupConsumer() {
        try {
        await consumer.setup("ROUTER", "direct", "PROVISION_REPLY", "PROVISION_REPLY");
        const handleMessage = (message) => {
            console.log(JSON.parse(message.content.toString()));
        };
        consumer.consume(handleMessage);
        } catch (error) {
        console.error("Error setting up consumer:", error);
        }
    }
    setupConsumer();

    return { producer, consumer };
}

//endpoint to get all the users who have activated services
const prepareForSendServices = () => {
    // Create an instance of the Consumer class
    const consumer = new Consumer();
    const producer = new Producer();

    // Set up the consumer
    async function setupConsumer() {
    try {
        // Set up the consumer to listen to the same exchange and routing key
        await consumer.setup("ROUTER", "direct", "SERVICES", "SERVICES");
        // Define a callback function to handle incoming messages
        // Here we only need replyTo and correlationId from the message properties
        //then all the services will be sent to the billing system
        const handleMessage = async(message) => {
            const msg = JSON.parse(message.content.toString());
            const { correlationId, replyTo } = message.properties;
            console.log("recieved message options :",message.properties);
            // console.log(msg);

            //return the services
            try {
                console.log('sending all the services');
                
                //call the provision system REST API to get all the services
                const services = await axios.get(process.env.PROVISION_SYSTEM_URL + process.env.PROVISION_SYSTEM_PORT + '/services');
                
                //return the services
                producer.produceToQueue(
                    "ROUTER",
                    "direct",
                    replyTo,
                    {
                        statusCode: 200,
                        data: services?.data
                    },
                    {
                      correlationId: correlationId,
                    }
                );
                console.log("response sent to billing system");
            } catch (error) {
                console.error(error);

                producer.produceToQueue(
                    "ROUTER",
                    "direct",
                    replyTo,
                    {
                        statusCode: error.response?.status || 500,
                        message: error?.response?.data?.message
                    },
                    {
                      correlationId: correlationId,
                    }
                );
            }
        };
        consumer.consume(handleMessage);
    } catch (error) {
        console.error("Error setting up consumer:", error);
    }
    }

    async function setupProducer() {
    try {
        // Set up the consumer to listen to the same exchange and routing key
        await producer.setup();
    } catch (error) {
        console.error("Error setting up consumer:", error);
    }
    }

    setupProducer();
    setupConsumer();

    return { producer, consumer };
}

const {producer,consumer} = prepareForSendServices();


