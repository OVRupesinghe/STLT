const express = require('express');
const app = express();
require('dotenv').config();
const data = require('./schema/data.json'); //
const fs = require('fs');
const {v4: uuid } = require('uuid');
const e = require('express');

app.use(express.json());


//endpoint to get all the services provided by the provision system REST API
app.get('/services', async (req, res) => {
    try {
        console.log('sending all the services');
        
        //call the provision system REST API to get all the services
        const services = await axios.get(env.process.PROVISION_SYSTEM_URL + env.process.PROVISION_SYSTEM_PORT + '/services');
        
        //return the services
        res.statusCode = 200;
        res.json(services.data);
    } catch (error) {
        console.error(error);
        res.statusCode = error.response.status;
        res.json({ message: error.response.data.message });
    }
});

//endpoint to get specific the service provided by the provision system REST API
app.get('/services/:id', async (req, res) => {
    try {
        console.log('sending the service with id: ' + req.params.id);
        
        //call the provision system REST API to get all the services
        const service = await axios.get(env.process.PROVISION_SYSTEM_URL + env.process.PROVISION_SYSTEM_PORT + '/services/' + req.params.id);
        
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
        console.log('activating the service with id: ' + req.params.id);

        //do we check that the user has already activated the service? or is it done by the provision system?
        
        //call the provision system REST API to activate the service
        const service = await axios.post(env.process.PROVISION_SYSTEM_URL + env.process.PROVISION_SYSTEM_PORT + '/services/' + req.params.id + '/activate', req.body);

        //TODO:: add payment service call here
        
        //return the services
        res.statusCode = 200;
        res.json(service.data);
    } catch (error) {
        console.error(error);
        res.statusCode = error.response.status;
        res.json({ message: error.response.data.message });
    }
});

//endpoint to deactivate a service for a given user id
app.post('/services/:id/deactivate', async (req, res) => {
    try {
        console.log('deactivating the service with id: ' + req.params.id);
        
        //call the provision system REST API to deactivate the service
        const service = await axios.post(env.process.PROVISION_SYSTEM_URL + env.process.PROVISION_SYSTEM_PORT + '/services/' + req.params.id + '/deactivate', req.body);
        
        //return the services
        res.statusCode = 200;
        res.json(service.data);
    } catch (error) {
        console.error(error);
        res.statusCode = error.response.status;
        res.json({ message: error.response.data.message });
    }
});




