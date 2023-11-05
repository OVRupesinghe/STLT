const express = require('express');
const app = express();
require('dotenv').config();
const data = require('./schema/data.json'); //
const fs = require('fs');
const {v4: uuid } = require('uuid');
const axios = require('axios');
const Consumer = require("../service_message_queue/consumer");
const Producer = require("../service_message_queue/producer");

app.use(express.json());

//in this microservice we will be using the external payment gateway service to process payments

//tokenize the credit card information
app.post('/payment/tokenize', async (req, res) => {
    
    const { statusCode, data, message } = await tokenizeCreditCard(req);
    res.statusCode = statusCode;
    res.json({ data, message });
});

const tokenizeCreditCard = async (req) => {
    try {
        console.log('tokenizing the credit card information');

        //call the payment gateway REST API to tokenize the credit card information
        const token = await axios.post(process.env.PAYMENT_GATEWAY_URL + process.env.PAYMENT_GATEWAY_PORT + '/payments/tokenize', req.body);

        console.log("Done");
        return { statusCode: 200, data: token.data };
    } catch (error) {
        console.error(error);
        return { statusCode: error.response.status, message: error.response.statusText };
    }
}

const processPayment = async (req) => {
    try {
        console.log('processing the payment');

        //call the payment gateway REST API to process the payment
        const payment = await axios.post(process.env.PAYMENT_GATEWAY_URL + process.env.PAYMENT_GATEWAY_PORT + '/payments/', req.body);

        if(payment.data.status){
            //create the payment in the database (in this case we will use a json file)
            const paymentData = {
                id: uuid(),
                userId: req.body.userId,
                serviceId: req.body.serviceId,
                amount: req.body.amount,
                status: payment.data.status,
                token: req.body.token
            };

            //add the payment to the database
            data.push(paymentData);
            fs.writeFileSync('./schema/data.json', JSON.stringify(data, null, 2));
            console.log('Data written to file');

            //return the payment
            return { statusCode: 200, data: paymentData };
        }
    } catch (error) {
        console.error(error.response);
        return { statusCode: error.response.status, message: error.response.statusText };
    }
}

//process the payment (create a payment)
app.post('/payment/process', async (req, res) => {
    
    const { statusCode, data, message } = await processPayment(req);
    res.statusCode = statusCode;
    res.json({ data, message });
});

//refund the payment
app.post('/payment/:id/refund', async (req, res) => {
    try {
        console.log('refunding the payment with id: ' + req.params.id);

        //call the payment gateway REST API to refund the payment
        const response = await axios.post(process.env.PAYMENT_GATEWAY_URL + process.env.PAYMENT_GATEWAY_PORT + '/payments/' + req.params.id + '/refund', req.body);

        const payment = response.data;
        // console.log(payment);
        if(payment.status){
            //update the payment in the database (in this case we will use a json file)
            if (payment.id == req.params.id) {
                fs.writeFileSync('./schema/data.json', JSON.stringify(data, null, 2));
                console.log('Data written to file');
            }
            
            //return the payment
            res.statusCode = 200;
            res.json(payment);
        }

        //return the payment
        res.statusCode = 200;
        res.json(payment);
    } catch (error) {
        console.error(error);
        res.statusCode = error.response.status;
        res.json({ message: error.response.data.message });
    }
});

//get a payment details
app.get('/payment/:id', async (req, res) => {
    try {
        console.log('getting the payment details with id: ' + req.params.id);

        //call the payment gateway REST API to get the payment details
        const response = await axios.get(process.env.PAYMENT_GATEWAY_URL + process.env.PAYMENT_GATEWAY_PORT + '/payments/' + req.params.id);
        const payment = response.data;

        //?do we have to send the data in the schema/data.json file? or is it done by the payment gateway?
        //concatenate the data from the database and the payment gateway

        if (payment.id == req.params.id) {
            //return the payment
            res.statusCode = 200;
            res.json(payment);
            return;
        }

        
    } catch (error) {
        console.error(error);
        res.statusCode = error.response.status;
        res.json({ message: error.response.data.message });
    }
});


//start the server
app.listen(process.env.PAYMENT_GATEWAY_SERVICE_PORT, () => {
    console.log('payment gateway microservice started on port: ' + process.env.PAYMENT_GATEWAY_SERVICE_PORT);
});



//call endpoint to process a payment
const prepareForProcessPayment = () => {
    // Create an instance of the Consumer class
    const consumer = new Consumer();
    const producer = new Producer();

    // Set up the consumer
    async function setupConsumer() {
        try {
            await consumer.setup("ROUTER", "direct", "PAYMENTS", "PAYMENTS");
            const handleMessage = async(request) => {

                // need to recieve the data from the message format:
                /*
                {
                    "cardName":"00820970869708",
                    "expDate":"2025-09-20",
                    "cvv":123,
                    "userId":"1",
                    "serviceId":"1",
                    "amount":1000,
                }
                *must
                */
                //?No error handling done for now

                const req = JSON.parse(request.content.toString());
                const { correlationId, replyTo } = request.properties;

                //return the token from credit card data
                let req1 = {body:{...req,userId:'',serviceId:'',amount:''}};
                const tokenData = await tokenizeCreditCard(req1);

                if(tokenData.statusCode != 200)
                {
                    producer.produceToQueue(
                        "ROUTER",
                        "direct",
                        replyTo,
                        {
                            statusCode: tokenData.statusCode,
                            message: tokenData.message
                        },
                        {
                        correlationId: correlationId,
                        }
                    );
                    console.log("sent payment status[FAILED]:", tokenData);
                    return;
                }

                //process the payment using generated token
                const req2 = {body:{...req,token:tokenData?.data?.token,cardName:'',expDate:'',cvv:''}};
                const { statusCode, data, message } = await processPayment(req2);
                let response = {};
                if(statusCode == 200)
                {
                    response = {
                        statusCode: statusCode,
                        data: data
                    };
                }
                else
                {
                    response = {
                        statusCode: statusCode,
                        message: message
                    };
                }

                producer.produceToQueue(
                    "ROUTER",
                    "direct",
                    replyTo,
                    {
                        ...response,
                    },
                    {
                    correlationId: correlationId,
                    }
                );
                console.log("sent payment status:[SUCCESS]", response);
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

const {producer,consumer} = prepareForProcessPayment();