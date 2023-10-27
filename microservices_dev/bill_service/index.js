const express = require('express');
const app = express();
require('dotenv').config();
const data = require('./schema/data.json');
const fs = require('fs');
const {v4: uuid } = require('uuid');

app.use(express.json());

//get bills of a user
app.get('/bills/:userId', (req, res) => {
    console.log('sending all the bills of a user');
    const userId = req.params.userId;
    const bills = [];

    for (bill of data) {
        if (bill.userId == userId) {
            bills.push(bill);
        }
    }
    res.statusCode = 200;
    res.json(bills);
});


//get a specific bill
app.get('/bill/:id', (req, res) => {
    console.log('sending the bill with id: ' + req.params.id);
    const billId = req.params.id;

    for (bill of data) {
        if (bill.id == billId) {
            res.statusCode = 200;
            res.json(bill);
            return;
        }
    }
    res.statusCode = 404;
    res.json({ message: "Bill cannot be found" });
});

//create bill
app.post('/bill', (req, res) => {
    console.log('creating a new bill');
    let billData = req.body;
    try {
        const newBillInfo = {
            id: uuid(),
            userId: billData.userId,
            serviceId: billData.serviceId,
            amount: billData.amount,
            when: new Date(),
            status: 'pending'
        };

        data.push(newBillInfo);

        fs.writeFileSync('./schema/data.json', JSON.stringify(data, null, 2));

        //TODO:: send message to notification service to notify the user about the bill

        console.log('Data written to file');
        res.statusCode = 201;
        res.json(newBillInfo);

    }
    catch (err) {
        console.error('Error writing file', err);
        res.json({ message: "Internal server error occurred" });
    }
});


//pay the bill
app.post('/bill/:id/pay', async (req, res) => {
    try {
        console.log('paying the bill with id: ' + req.params.id);

        //TODO:: send message to the payment gateway service to process the payment and get the payment status
        const payment = true;

        if(payment){
            //update the bill in the database (in this case we will use a json file)
            for (bill of data) {
                if (bill.id == req.params.id) {
                    bill.status = 'paid';
                    fs.writeFileSync('./schema/data.json', JSON.stringify(data, null, 2));
                    console.log('Data written to file');
                    break;
                }
            }

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


//cancel the bill
app.post('/bill/:id/cancel', async (req, res) => {
    try {
        console.log('cancelling the bill with id: ' + req.params.id);

        if(payment.data.status){
            //update the bill in the database (in this case we will use a json file)
            for (bill of data) {
                if (bill.id == req.params.id) {
                    bill.status = payment.data.status;
                    fs.writeFileSync('./schema/data.json', JSON.stringify(data, null, 2));
                    console.log('Data written to file');
                    break;
                }
            }

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
