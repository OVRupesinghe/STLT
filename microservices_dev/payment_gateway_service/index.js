const express = require('express');
const app = express();
require('dotenv').config();
const data = require('./schema/data.json'); //
const fs = require('fs');
const {v4: uuid } = require('uuid');
const e = require('express');

app.use(express.json());

//in this microservice we will be using the external payment gateway service to process payments

//tokenize the credit card information
app.post('/payment/tokenize', async (req, res) => {
    try {
        console.log('tokenizing the credit card information');

        //call the payment gateway REST API to tokenize the credit card information
        const token = await axios.post(env.process.PAYMENT_GATEWAY_URL + env.process.PAYMENT_GATEWAY_PORT + '/payment/tokenize', req.body);

        //return the token
        res.statusCode = 200;
        res.json(token.data);
    } catch (error) {
        console.error(error);
        res.statusCode = error.response.status;
        res.json({ message: error.response.data.message });
    }
});

//process the payment (create a payment)
app.post('/payment/process', async (req, res) => {
    try {
        console.log('processing the payment');

        //call the payment gateway REST API to process the payment
        const payment = await axios.post(env.process.PAYMENT_GATEWAY_URL + env.process.PAYMENT_GATEWAY_PORT + '/payment/', req.body);

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
            res.statusCode = 200;
            res.json(payment.data);
        }
    } catch (error) {
        console.error(error);
        res.statusCode = error.response.status;
        res.json({ message: error.response.data.message });
    }
});

//refund the payment
app.post('/payment/:id/refund', async (req, res) => {
    try {
        console.log('refunding the payment with id: ' + req.params.id);

        //call the payment gateway REST API to refund the payment
        const payment = await axios.post(env.process.PAYMENT_GATEWAY_URL + env.process.PAYMENT_GATEWAY_PORT + '/payment/' + req.params.id + '/refund', req.body);

        if(payment.data.status){
            //update the payment in the database (in this case we will use a json file)
            for (payment of data) {
                if (payment.id == req.params.id) {
                    payment.status = payment.data.status;
                    fs.writeFileSync('./schema/data.json', JSON.stringify(data, null, 2));
                    console.log('Data written to file');
                    break;
                }
            }

            //return the payment
            res.statusCode = 200;
            res.json(payment.data);
        }

        //return the payment
        res.statusCode = 200;
        res.json(payment.data);
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
        const payment = await axios.get(env.process.PAYMENT_GATEWAY_URL + env.process.PAYMENT_GATEWAY_PORT + '/payment/' + req.params.id);

        //?do we have to send the data in the schema/data.json file? or is it done by the payment gateway?

        let returnPayment = payment.data;

        //concatenate the data from the database and the payment gateway
        for (payment of data) {
            if (payment.id == req.params.id) {
                returnPayment = {...returnPayment, ...payment};
                break;
            }
        }

        //return the payment
        res.statusCode = 200;
        res.json(payment.data);
    } catch (error) {
        console.error(error);
        res.statusCode = error.response.status;
        res.json({ message: error.response.data.message });
    }
});


//start the server
app.listen(process.env.PAYMENT_GATEWAY_SERVICE_PORT, () => {
    console.log('payment gateway service started on port: ' + process.env.PAYMENT_GATEWAY_SERVICE_PORT);
});