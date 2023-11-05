const WebSocket = require("ws");

class SupportSupervisor {
    constructor(serverUrl) {
        this.serverUrl = `${serverUrl}?role=supervisor`;
        this.websocket = null;
        this.init();
    }

    init() {
        this.websocket = new WebSocket(this.serverUrl);
        this.websocket.onopen = this.handleOpen.bind(this);
        this.websocket.onmessage = this.handleMessage.bind(this);
        this.websocket.onclose = this.handleClose.bind(this);
    }

    handleOpen() {
        console.log("Connected as a supervisor.");
    }

    handleMessage(event) {
        const message = JSON.parse(event.data);
        console.log("Received message:", message);
    }

    handleClose() {
        console.log("Disconnected as a supervisor.");
    }

    handleSend(plainTextMessage) {
        if (this.websocket.readyState === WebSocket.OPEN) {
            const message = {
                type: "MESSAGE",
                chatRoomId: this.chatRoomId,
                message: plainTextMessage,
            };
            this.websocket.send(JSON.stringify(message));
        } else {
            console.error(
                "WebSocket connection is not open. Message not sent."
            );
        }
    }
}

// Usage:
// const supervisorClient = new SupervisorChatClient('ws://your-server-url');
// use the env to get the server URL in the calling code
// module.exports = SupportSupervisor;

// this is an example only
/* const supervisor = new SupportSupervisor(`ws://localhost:50001`);
setInterval(() => {
    supervisor.handleSend("Hi, I am doing fine. What about you?");
}, 5000);
 */
