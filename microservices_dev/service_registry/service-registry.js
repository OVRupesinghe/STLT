const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.dataFile = './schema/data.json';
  }

  register(serviceName, host, port) {
    const service = {
      name: serviceName,
      host,
      port,
      lastHeartbeat: Date.now(),
    };

    this.services.set(serviceName, service);

    this.saveData();
  }

  deregister(serviceName) {
    this.services.delete(serviceName);

    this.saveData();
  }

  getServices() {
    return [...this.services.values()];
  }

  getService(serviceName) {
    return this.services.get(serviceName);
  }

  loadData() {
    const data = fs.readFileSync(this.dataFile);
    const services = JSON.parse(data);

    for (const service of services) {
      this.services.set(service.name, service);
    }
  }

  saveData() {
    const data = JSON.stringify(this.services.values());
    fs.writeFileSync(this.dataFile, data);
  }

  getHeartbeatInterval() {
    return process.env.HEARTBEAT_INTERVAL;
  }
}

const serviceRegistry = new ServiceRegistry();

serviceRegistry.loadData();

// Start the heartbeat checker for the registered services
/*
setInterval(async () => {
  for (const service of serviceRegistry.getServices()) {
    try {
      const response = await axios.get("http://" + service.host + ":" + service.port + "/heartbeat");
      if (response.status === 200) {
        service.lastHeartbeat = Date.now();
      } else {
        serviceRegistry.deregister(service.name);
      }
    } catch (error) {
    }
  }
}, serviceRegistry.getHeartbeatInterval());
*/

module.exports = serviceRegistry;

