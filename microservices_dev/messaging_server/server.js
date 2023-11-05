const WebSocket = require("ws");
const http = require("http");
const express = require("express");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();
const url = require("url");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Set(); // new clients are added to this
const supervisors = new Set(); // new supervisors are added to this

const chatRooms = new Map(); // to keep track of the clients and associated supervisors

const waitingQueue = []; // A queue for waiting clients
const availableSupervisors = []; // A queue for available supervisors

const checkSupervisorAvailability = (supervisorsQueue) => {
    // if needed change the conditions later
    return supervisorsQueue.length > 0;
};

const assignSupervisors = () => {
    if (
        checkSupervisorAvailability(availableSupervisors) &&
        waitingQueue.length > 0
    ) {
        let availableSupervisor = availableSupervisors.shift();
        let waitingClient = waitingQueue.shift();
        let chatRoom = chatRooms.get(waitingClient.chatRoomId);
        chatRoom.supervisor = availableSupervisor;
        waitingClient.send(
            JSON.stringify({
                status: "SUPPORT_SUPERVISOR_CONNECTED",
                message:
                    "Thank you for waiting, a supervisor has been connected.",
            })
        );
        availableSupervisor.chatRoomId = waitingClient.chatRoomId;
    }
};

wss.on("connection", (ws, req) => {
    const query = url.parse(req.url, true).query; // get the user role from the parameter
    const role = query.role;

    if (role === "client") {
        ws.role = "client";
        ws.chatRoomId = query.chatRoomId || uuidv4(); // if there is a chat room id use that otherwise,
        clients.add(ws); // add the client to the clients
        let chatRoom = {
            client: ws,
            supervisor: null,
        };
        if (availableSupervisors.length > 0) {
            // if there are available supervisors add one to the clients chat room
            let supervisor = availableSupervisors.shift();
            chatRoom.supervisor = supervisor;
            supervisor.chatRoomId = ws.chatRoomId;
            ws.send(
                JSON.stringify({
                    status: "SUPPORT_SUPERVISOR_CONNECTED",
                    message: "A supervisor has been connected.",
                })
            );
        } else {
            waitingQueue.push(ws); // else the client is waiting
            ws.send(
                JSON.stringify({
                    status: "WAITING",
                })
            );
        }
        chatRooms.set(ws.chatRoomId, chatRoom); // create a new chat room
    } else if (role === "supervisor") {
        ws.role = "supervisor";
        ws.chatRoomId = null;
        supervisors.add(ws);
        availableSupervisors.push(ws);
    } else {
        // this is an invalid role remove the client
        ws.send(
            JSON.stringify({
                status: "ERROR",
                message: "Invalid user role, connection terminated",
            })
        );
        ws.close(1000);
    }
    // Handle client messages
    ws.on("message", (message) => {
        if (waitingQueue.includes(ws)) {
            ws.send(
                JSON.stringify({
                    status: "WAITING",
                    message:
                        "Sorry cannot send messages until a tech support joins.",
                })
            );
        } else if (chatRooms.has(ws.chatRoomId)) {
            let chatRoom = chatRooms.get(ws.chatRoomId);
            if (ws !== chatRoom.supervisor) chatRoom.supervisor.send(message, { binary: false });
            else chatRoom.client.send(message, { binary: false });
        } else if (availableSupervisors.includes(ws)) {
            ws.send(
                JSON.stringify({
                    status: "SUPER_WAITING_IN_THE_AVAILABLE_QUEUE",
                    message:
                        "You cannot send messages, there are not clients you are in the available queue.",
                })
            );
        } else {
            ws.send(
                JSON.stringify({
                    message: "Authentication failed, please retry later.",
                })
            );
            ws.close();
        }
    });

    // Handle client disconnection
    ws.on("close", () => {
        if (ws.role === "client") {
            if (waitingQueue.includes(ws)) {
                waitingQueue.splice(waitingQueue.indexOf(ws), 1);
                chatRooms.delete(ws.chatRoomId);
            } else {
                let chatRoom = chatRooms.get(ws.chatRoomId);
                let supervisor = chatRoom.supervisor;
                supervisor.send(
                    JSON.stringify({
                        status: "CLIENT_DISCONNECTED",
                        message: "Hmm, seems the client has been disconnected.",
                    })
                );
                supervisor.chatRoomId = null;
                availableSupervisors.push(supervisor);
            }
            clients.delete(ws); // remove the client from the clients
            ws.send(
                JSON.stringify({
                    status: "DISCONNECTED",
                    message: "Sorry to see you go, please try again later.",
                })
            );
        } else if (ws.role === "supervisor") {
            if (availableSupervisors.includes(ws)) {
                availableSupervisors.splice(
                    availableSupervisors.indexOf(ws),
                    1
                );
            } else {
                let chatRoom = chatRooms.get(ws.chatRoomId);
                chatRoom.supervisor = null;
                chatRoom.client.send(
                    JSON.stringify({
                        status: "SUPPORT_SUPERVISOR_DISCONNECTED",
                        message:
                            "The support supervisor has been disconnected, and you will have to wait until another supervisor is connected",
                    })
                );
                waitingQueue.push(chatRoom.client);
            }
            ws.send(
                JSON.stringify({
                    status: "DISCONNECTED",
                    message: "We need supervisors here, please join again.",
                })
            );
            supervisors.delete(ws); // remove the supervisor from the supervisors
        }
        ws.close(); // close the connection
    });
});

// Periodically check for supervisor availability (e.g., every 1 seconds)
setInterval(() => assignSupervisors(), 1000);

const PORT = process.env.WEB_SOCKET_SERVER_PORT;
server.listen(PORT, () => {
    console.log(`Chat service is running on port ${PORT}`);
});
