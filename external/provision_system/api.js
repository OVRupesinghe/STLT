const express = require('express');
const app = express();
require('dotenv').config();
const data = require('./data.json');
const fs = require('fs');
const {v4: uuid } = require('uuid');

app.use(express.json());

//all the mock REST API endpoints for the provision system

//get request to get all the services
app.get('/services', (req, res) => {
    console.log('sending all the services');
    res.statusCode = 200;
    res.json(data);
});

//get request to get a specific service
app.get('/services/:id', (req, res) => {
    console.log('sending the services with id: ' + req.params.id);
    const serviceId = req.params.id;

    for (service of data) {
        if (service.id == serviceId) {
            res.statusCode = 200;
            res.json(service);
            return;
        }
    }
    res.statusCode = 404;
    res.json({ message: "Service cannot be found" });
});

//create service (probably not needed)
app.post('/services', (req, res) => {
    console.log('creating a new service');
    let serviceData = req.body;
    try {
        const newServiceInfo = {
            id: uuid(),
            name: serviceData.name,
            description: serviceData.description,
            price: serviceData.price
        };

        data.push(newServiceInfo);

        fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));
        console.log('Data written to file');
        res.statusCode = 201;
        res.json(newServiceInfo);


    } catch (err) {
        console.error('Error writing file', err);
        res.statusCode = 500;
        res.json({ message: "Internal server error occurred" });
    }
});

//activate service
app.post('/services/:id/activate', (req, res) => {
    console.log('activating the service with id: ' + req.params.id + ' for the user with id: ' + req.body.userId);
    const serviceId = req.params.id;

    //only check if the service exists
    for (service of data) {
        if (service.id == serviceId) {

            // console.log(service.users.find(user => user.id == req.body.userId).status);

            if(service.users.filter(user => user.id == req.body.userId).length > 0){ 
                
                let user = service.users.find(user => user.id == req.body.userId)
                if(user.status == 'active'){
                    res.statusCode = 200;
                    console.log('Service already activated');
                    res.json({ message: "Service already activated" });
                    return;
                }
                else{
                    user.status = 'active';
                }                 
            } else {
                service.users.push({
                    id: req.body.userId,
                    status: 'active'
                });
            }
            
            try {        
                fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));
                console.log('Data written to file');
                res.statusCode = 204;   //activated
                res.json({ message: "Service activated successfully" });
                return;        
            } catch (err) {
                console.error('Error writing file', err);
                res.statusCode = 500;
                res.json({ message: "Internal server error occurred" });
                return;
            }
        }
    }

    res.statusCode = 404;
    res.json({ message: "Service cannot be found" });
});

//deactivate service
app.post('/services/:id/deactivate', (req, res) => {
    console.log('deactivating the service with id: ' + req.params.id + ' for the user with id: ' + req.body.userId);
    const serviceId = req.params.id;

    //only check if the service exists
    for (service of data) {
        if (service.id == serviceId) {
            let user = service.users.find(user => user.id == req.body.userId);
            if(user.status == 'inactive'){
                res.statusCode = 200;
                console.log('Service already deactivated');
                res.json({ message: "Service already deactivated" });
                return;
            }
            else{
                user.status = 'inactive';
            }

            try {        
                fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));
                console.log('Data written to file');
                res.statusCode = 204;   //deactivated
                res.json({ message: "Service deactivated successfully" });
                return;        
            } catch (err) {
                console.error('Error writing file', err);
                res.statusCode = 500;
                res.json({ message: "Internal server error occurred" });
                return;
            }
        }
    }

    res.statusCode = 404;
    res.json({ message: "Service cannot be found" });
});

//start the server
app.listen(process.env.PORT, () => {
    console.log('Provision system service started on port ' + process.env.PORT);
});