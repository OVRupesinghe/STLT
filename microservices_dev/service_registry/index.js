const express = require('express');
const serviceRegistry = require('./service-registry');
require('dotenv').config();

const app = express();

app.get('/services/:serviceName', (req, res) => {
  const serviceName = req.params.serviceName; // this should be called as follows +> /discover?serviceName=nameOfTheService
  console.log(serviceName);
  if (serviceName) {
    const serviceInfo = serviceRegistry.getService(serviceName);
    res.statusCode = 200;
    res.json({ serviceInfo : {
      name: serviceInfo.name,
      host: serviceInfo.host,
      port: serviceInfo.port
    } });
  } else {
    res.statusCode = 400;
    res.end("Service not found");
  }
});

app.get('/services', (req, res) => {
  res.statusCode = 200;
  res.json({ services : serviceRegistry.getServices() });
});

app.post('/services', (req, res) => {
  const serviceName = req.body.serviceName;
  const serviceHost = req.body.serviceHost;
  const servicePort = req.body.servicePort;

  if (serviceName && serviceHost && servicePort) {
    serviceRegistry.register(serviceName, serviceHost, servicePort);
    res.sendStatus(200);
  } else {
    res.sendStatus(400);
  }
});

app.delete('/services/:serviceName', (req, res) => {
  const serviceName = req.params.serviceName;
  if (serviceName) {
    serviceRegistry.deregister(serviceName);
    res.sendStatus(204);
  }
  res.sendStatus(400);
});

app.listen(process.env.PORT, () => {
  console.log(`listening on http://localhost:${process.env.PORT}`);
});

