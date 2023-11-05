const WebSocket = require("ws");

class SupportClient {
    constructor(serverUrl) {
        this.serverUrl = `${serverUrl}?role=client`;
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
        console.log("Connected as a client.");
    }

    handleMessage(event) {
        const message = JSON.parse(event.data);
        console.log("Received message:", message);
    }

    handleClose() {
        console.log("Disconnected as a client.");
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
// const clientClient = new ClientChatClient('ws://your-server-url'); you can get the server url from the .env
// use the env to get the server URL in the calling code
// module.exports = SupportClient;

// this is an example
/* const client = new SupportClient(`ws://localhost:50001`);
setInterval(() => {
    client.handleSend("Hello, how are you doing?");
}, 5000);
 */
