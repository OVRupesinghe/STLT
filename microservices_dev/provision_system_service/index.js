const express = require('express');
const app = express();
require('dotenv').config();
const data = require('./schema/service_users.json'); //
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

        //?do we check that the user has already activated the service? or is it done by the provision system?
        
        //add to data.json file
        for (service of data) {
            if(service.id == req.params.id){
                service.users.filter(user => user.id == req.body.userId) ? 
                
                service.users.find(user => user.id == req.body.userId).status = 'active' :                  

                service.users.push({
                    id: req.body.userId,
                    status: 'active'
                });
                break;
            }
        }
        //call the provision system REST API to activate the service
        const response = await axios.post(env.process.PROVISION_SYSTEM_URL + env.process.PROVISION_SYSTEM_PORT + '/services/' + req.params.id + '/activate', req.body);

        if(response.status){
            //TODO:: add payment service call here

            //return the services
            res.statusCode = 200;
            res.json({
                message: 'Service activated successfully',
            });
        }
        else{
            res.statusCode = 400;
            res.json({
                message: 'Service activation failed',
            });
        }
        
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
        
        //add to data.json file
        for (service of data) {
            if(service.id == req.params.id){
                service.users.find(user => user.id == req.body.userId).status = 'inactive';
                break;
            }
        }
        //call the provision system REST API to deactivate the service
        const response = await axios.post(env.process.PROVISION_SYSTEM_URL + env.process.PROVISION_SYSTEM_PORT + '/services/' + req.params.id + '/deactivate', req.body);

        if(response.status){
            res.statusCode = 200;
            res.json({
                message: 'Service deactivated successfully',
            });
        }
        else{
            res.statusCode = 400;
            res.json({
                message: 'Service deactivation failed',
            });
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
        
        //users who have activated the service is in the schema/data.json file
        const users = [];

        for (service of data) {
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
    console.log(`Listening on port http://localhost:${process.env.PORT}`);
});



