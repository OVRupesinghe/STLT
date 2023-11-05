const express = require('express');
const app = express();
require('dotenv').config();
const data = require('./schema/data.json');
const fs = require('fs');
const {v4: uuid } = require('uuid');

app.use(express.json());

//get bills of a user
app.get('/bills/user/:userId', (req, res) => {
    console.log('sending all the bills of a user');
    const userId = req.params.userId;
    const bills = [];

    // Check if query parameters for date range are present
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    for (bill of data) {
        if (bill.userId == userId) {
            // Check if bill is within date range
            if ((!startDate || bill.when >= startDate) && (!endDate || bill.when <= endDate)) {
                bills.push(bill);
            }
        }
    }
    res.statusCode = 200;
    res.json(bills);
});


//get a specific bill
app.get('/bills/:id', (req, res) => {
    const billId = req.params.id;

    for (bill of data) {
        console.log(bill.id + ' , ' + billId);
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
app.post('/bills', (req, res) => {
    console.log('creating a new bill');
    let billData = req.body;
    try {
        const newBillInfo = createBill(billData);

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
app.post('/bills/:id/pay', async (req, res) => {
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
            res.json("Payment successful");
        }
    } catch (error) {
        console.error(error);
        res.statusCode = error.response.status;
        res.json({ message: error.response.data.message });
    }
});


//cancel the bill
app.post('/bills/:id/cancel', async (req, res) => {
    try {
        console.log('cancelling the bill with id: ' + req.params.id);

        //TODO:: send message to the payment gateway service to cancel the payment and get the payment status
        const payment = {data: {status: 'cancelled'}};

        if(payment?.data?.status){
            //update the bill in the database (in this case we will use a json file)
            for (bill of data) {
                if (bill.id == req.params.id) {
                    bill.status = payment?.data?.status;
                    fs.writeFileSync('./schema/data.json', JSON.stringify(data, null, 2));
                    console.log('Data written to file');
                    break;
                }
            }

            //return the payment
            res.statusCode = 200;
            res.json("Payment cancelled");
        }
    } catch (error) {
        console.error(error);
        res.statusCode = error.response.status;
        res.json({ message: error.response.data.message });
    }
});


//month start cron job to generate bills
app.post('/bills/generate', (req, res) => {
    console.log('generating bills for the month');
    try {
        //TODO:: call the provision system service to get all the users who have activated services


        //Step 1 : get all the services
        const services = []; //assign the response from the provision system service call to this variable

        //Step 2 : get all the activated users for each service
        for (service of services) {
            const activatedUsers = []; //assign the response from the provision system service call to this variable

            //Step 3 : calculate the bill for each user
            for (user of activatedUsers) {
                const billData = {
                    userId: user.id,
                    serviceId: service.id,
                    amount: service.price
                };
                //Step 4 : create the bill
                createBill(billData);

                //TODO:: send message to notification service to notify the user about the bill
            }
        }


    }
    catch (err) {
        console.error('Error writing file', err);
        res.json({ message: "Internal server error occurred" });
    }
});



const createBill = (billData) => {
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

    return newBillInfo;
}

//listen
app.listen(process.env.PORT, () => {
    console.log(`Server running at port ${process.env.PORT}`);
});