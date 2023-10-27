const express = require('express');
const app = express();
require('dotenv').config();
const data = require('./schema/data.json');
const fs = require('fs');
const {v4: uuid } = require('uuid');


//all the mock REST API endpoints for the payment gateway service

//get request to get all the payments
app.get('/payments', (req, res) => {
    console.log('sending all the payments');
    res.statusCode = 200;
    res.json(data);
});

//get request to get a specific payment
app.get('/payment/:id', (req, res) => {
    console.log('sending the payment with id: ' + req.params.id);
    const paymentId = req.params.id;

    for (payment of data) {
        if (payment.id == paymentId) {
            res.statusCode = 200;
            res.json(payment);
            return;
        }
    }
    res.statusCode = 404;
    res.json({ message: "Payment cannot be found" });
});

//create payment
app.post('/payment', (req, res) => {
    console.log('creating a new payment');
    let paymentData = req.body;
    try {
        if(processToken(paymentData.token)){   //a dummy function lol
            const newPaymentInfo = {
                id: uuid(),
                amount: paymentData.amount,
                when: new Date(),
                status: 'success'
            };

            data.push(newPaymentInfo);

            fs.writeFileSync('./schema/data.json', JSON.stringify(data, null, 2));
            console.log('Data written to file');
            res.statusCode = 201;
            res.json(newPaymentInfo);
        }
        else{
            res.statusCode = 400;
            res.json({ message: "Invalid token" });
        }


    } catch (err) {
        console.error('Error writing file', err);
        res.json({ message: "Internal server error occurred" });
    }
});


//tokenize credit card information
app.post('/payment/tokenize', (req, res) => {
    console.log('tokenizing the credit card information');
    const creditCardInfo = req.body;
    try {
        const token = tokenize(creditCardInfo.cardNum, creditCardInfo.expDate, creditCardInfo.cvv);
        res.statusCode = 200;
        res.json({ token: token });
    } catch (err) {
        console.error('Error writing file', err);
        res.json({ message: "Internal server error occurred" });
    }
});



//refund the payment
app.post('/payment/:id/refund', (req, res) => {
    console.log('refunding the payment with id: ' + req.params.id);
    const paymentId = req.params.id;

    for (payment of data) {
        if (payment.id == paymentId) {
            payment.status = 'refunded';
            fs.writeFileSync('./schema/data.json', JSON.stringify(data, null, 2));
            console.log('Data written to file');
            res.statusCode = 200;
            res.json(payment);
            return;
        }
    }
    res.statusCode = 404;
    res.json({ message: "Payment cannot be found" });
});


const crypto = require('crypto');

const tokenize = (cardNum, expDate, cvv) => {
    const secret = process.env.TOKEN_SECRET;
    const id = uuid();
    const payload = JSON.stringify({ cardNum, expDate, cvv, id });  // {"cardNum":"1234567890123456","expDate":"12/2022","cvv":"123", "id": "1234-1234-1234-1234"}
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);  // 16 bytes = 128 bits = block size
    const cipher = crypto.createCipheriv(algorithm, secret, iv);    // createCipheriv(algorithm, key, iv) // iv is the initialization vector, a random string used to encrypt the data
    let encrypted = cipher.update(payload, 'utf8', 'hex');  // cipher.update is used to encrypt the data
    encrypted += cipher.final('hex');   //final is used to return any remaining enciphered data (remaining data from the block size)
    const token = `${iv.toString('hex')}.${encrypted}`; // iv is the initialization vector, a random string used to encrypt the data
    return token;
};

const untokenize = (token) => {
    const secret = process.env.TOKEN_SECRET;
    const [iv, encrypted] = token.split('.');   // iv is the initialization vector, a random string used to encrypt the data (hex, and the encrypted data)
    const decipher = crypto.createDecipheriv('aes-256-cbc', secret, Buffer.from(iv, 'hex'));    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
};


const processToken = (token) => {
    untokenize(token);
    return true;
}
