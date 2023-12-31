const express = require('express');
const app = express();
require('dotenv').config();
const data = require('./schema/data.json');
const fs = require('fs');
const {v4: uuid } = require('uuid');
const Consumer = require("../service_message_queue/consumer"); // Import the Consumer class
const Producer = require("../service_message_queue/producer");

// Create an instance of the Consumer class & Producer class
const consumer = new Consumer();
const producer = new Producer();

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

        const {producer} = prepareForSendNotification();
        // console.log("sending message to notification service to notify the user about the bill : ", billData?.userId , " : ", billData?.amount);

        console.log('Data written to file');
        //TODO:: Need to send user email
        const message = {
            type: "EMAIL",
            message: `You have a bill of RS.${billData?.amount}`,
            from: "billingService@gmail.com",
            to: billData?.userId,//"userTemp@gmial.com",
        };
        producer.produceToQueue(
            "ROUTER",
            "direct",
            "NOTICES",
            { ...message, time: new Date().getTime()},
            {
            replyTo: "BILLING_NOTIFICATION_REPLY",
            correlationId: uuid(),
            }
        );

        console.log("Success sending notifications to the users");
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

        //check if bill exists
        let billExists = false;
        data.forEach(bill => {
            if(bill.id == req.params.id){
                billExists = true;
            }
        });
        if(!billExists){
            res.statusCode = 404;
            res.json({ message: "Bill cannot be found" });
            return;
        };


        //check if the bill is already paid
        for (bill of data) {
            if (bill.id == req.params.id) {
                if(bill.status == 'paid'){
                    res.statusCode = 400;
                    res.json({ message: "Bill is already paid" });
                    return;
                }
            }
        };


        //create consumer for get the payment status from the payment gateway sevice
        const consumer = new Consumer();

        // Set up the consumer to process the payment status
        await consumer.setup("ROUTER", "direct", "BILLING_SERVICES_REPLY", "BILLING_SERVICES_REPLY");
        const handleMessage = (channel,message) => {
            channel.ack(message); // acknowledge the message was received

            const response = JSON.parse(message.content.toString());
            // step 1 : check if the message is successful
            if(response.statusCode != 200){
                console.log("Error calling from payment gateway service");
                res.statusCode = response.statusCode;
                res.json({ "message": "Internal server error" });
                return;
            }
            else if(response.statusCode == 200)
            {
                // strp 2 : get the status
                console.log("Excecuted process payment from payment gateway service");
                const payment = response.data;

                console.log(payment);

                if(payment){
                    //update the bill in the database (in this case we will use a json file)
                    for (bill of data) {
                        if (bill.id == req.params.id) {
                            bill.status = 'paid';
                            bill.paymentId = payment?.id;
                            fs.writeFileSync('./schema/data.json', JSON.stringify(data, null, 2));
                            console.log('Data written to file');
                            break;
                        }
                    }

                    //send message to the notification service to notify the user about the bill
                    const {producer} = prepareForSendNotification();
                    // console.log("sending message to notification service to notify the user about the bill : ", billData?.userId , " : ", billData?.amount);

                    console.log('Data written to file');
                    //TODO:: Need to send user email
                    const message = {
                        type: "EMAIL",
                        message: `You have a paid a bill of RS.${billData?.amount} , payment id : ${payment?.id} , payment status : ${payment?.status}, payment date : ${payment?.when}`,
                        from: "billingService@gmail.com",
                        to: billData?.userId,//"userTemp@gmial.com",
                    };
                    producer.produceToQueue(
                        "ROUTER",
                        "direct",
                        "NOTICES",
                        { ...message, time: new Date().getTime()},
                        {
                        replyTo: "BILLING_NOTIFICATION_REPLY",
                        correlationId: uuid(),
                        }
                    );

                    //return the payment
                    console.log("Payment successful");
                    res.statusCode = 200;
                    res.json("Payment successful");
                    return;
                }

                //return the payment
                console.log("Payment unsuccessful");
                res.statusCode = 500;
                res.json("Payment unsuccessful");
                return;

            }
        }

        //consume the payment status from the payment gateway service
        consumer.consume(handleMessage);
        const {producer} = createProducer();

        //just a request to the payment gateway service to get the payment status
        //reply will be sent to the BILLING_SERVICES_REPLY queue through the consumer   ^^^^ UP :D
        console.log("Sending request to process and get the payment status");
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
        const reqBody = {
            cardName: req.body.cardName,
            expDate: req.body.expDate,
            cvv: req.body.cvv,
            userId: req.body.userId,
            serviceId: req.body.serviceId,
            amount: req.body.amount
        };
        
        producer.produceToQueue(
            "ROUTER",
            "direct",
            "PAYMENTS",
            { ...reqBody, time: new Date().getTime() },
            {
            replyTo: "BILLING_SERVICES_REPLY",
            correlationId: uuid(),
            }
        );
        
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

        //?send message to the payment gateway service to cancel the payment and get the payment status
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
app.post('/bills/generate', async(req, res) => {
    console.log('generating bills for the month');
    try {

        //create consumer for get the services from the provision system
        const consumer = new Consumer();

        // Set up the consumer to process the services data
        await consumer.setup("ROUTER", "direct", "BILLING_SERVICES_REPLY", "BILLING_SERVICES_REPLY");
        const handleMessage = (channel,message) => {
            channel.ack(message); // acknowledge the message was received

            const response = JSON.parse(message.content.toString());

            // step 1 : check if the message is successful
            if(response.statusCode != 200){
                console.log("Error getting services from provision system");
                res.statusCode = response.statusCode;
                res.json({ "message": "Internal server error" });
                return;
            }
            else if(response.statusCode == 200)
            {
                // strp 2 : get the services
                console.log("Success getting services from provision service");
                const services = response.data;

                //Step 3 : get all the activated users for each service
                let users = [];
                for (service of services) {
                    const activatedUsers = service?.users;
                    //Step 3 : calculate the bill for each user
                    for (user of activatedUsers) {
                        const billData = {
                            userId: user?.id,
                            serviceId: service?.id,
                            amount: service?.price
                        };
                        //Step 4 : create the bill
                        createBill(billData);

                        //store the user in the users array
                        if(users.find(u => u.id == user.id)){
                            users = users.map((u) => {
                                if(u.id == user.id){
                                    u.amount += service?.price;
                                }
                                return u;
                            });
                        }
                        else{
                            users.push({...user, amount: service?.price});
                        }
                    }
                }

                //Step 5 : send message to notification service to notify the user about the bill      
                const {producer} = prepareForSendNotification();
                for(user of users){
                    // console.log("sending message to notification service to notify the user about the bill : ", user?.id , " : ", user?.amount);


                    // TODO:: Need to send user email
                    //?we currently don't have a user email, so we will send it to a temp email
                    //?we need to store the user email in the database or else ...
                    // send a message to the notification service to send an email to the user
                    const message = {
                        type: "EMAIL",
                        message: `You have a bill of RS.${user?.amount} settle on ${new Date().toLocaleString(undefined, { month: 'long' })} for the services you have activated }`,
                        from: "billingService@gmail.com",
                        to: user?.id,//"userTemp@gmial.com",
                    };
                    producer.produceToQueue(
                        "ROUTER",
                        "direct",
                        "NOTICES",
                        { ...message, time: new Date().getTime() },
                        {
                        replyTo: "BILLING_NOTIFICATION_REPLY",
                        correlationId: uuid(),
                        }
                    );
                }
                console.log("Success sending notifications to the users");
                res.statusCode = 201;
                res.json({ "message": "Success generating bills" });
                return;
            }

        };

        //consume the services data from the provision system
        consumer.consume(handleMessage);
        const {producer} = createProducer();

        //just a request to the provision system to get all the services
        //reply will be sent to the BILLING_SERVICES_REPLY queue through the consumer   ^^^^ UP :D
        console.log("Sending request to get all the services");
        producer.produceToQueue(
            "ROUTER",
            "direct",
            "SERVICES",
            { time: new Date().getTime() },
            {
            replyTo: "BILLING_SERVICES_REPLY",
            correlationId: uuid(),
            }
        );

    }
    catch (error) {
        console.error("Error setting up consumer:", error);
        // console.error('Error writing file', error);
        res.json({ message: "Internal server error occurred" });
    }
});



const createBill = (billData) => {
    const newBillInfo = {
        id: uuid(),
        paymentId: '',
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
    console.log(`Billing microservice Server running at port ${process.env.PORT}`);
});


const createProducer = ()=>{
    // Create an instance of the Producer class
    const producer = new Producer();

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

    return {producer};
}

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
        await consumer.setup("ROUTER", "direct", "BILLING_NOTIFICATION_REPLY", "BILLING_NOTIFICATION_REPLY");
        const handleMessage = (channel,message) => {
            channel.ack(message); // acknowledge the message was received
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