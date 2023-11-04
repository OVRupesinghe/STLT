from http import client
import socket
import threading
import json

# DONT USE THIS FOR ANY THING

class MessageQueueServer:

    def __init__(self, port):
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server_socket.bind(('localhost', port))
        self.server_socket.listen(10)
        self.client_connections = {}  # houses the incoming connections
        self.message_queues = {}  # this should be a queue for queues

    def start(self):
        while True:
            client_socket, client_address = self.server_socket.accept()
            self.client_connections[client_socket] = client_address
            thread = threading.Thread(
                target=self.handle_client_connection,
                args=(client_socket, client_address)
            )
            thread.start()

    # method to handle clients when joining
    def on_connection(self, client_socket, client_address):
        """
            CONNECTIONS SHOULD BE ESTABLISHED USING THE FOLLOWING TYPE OF
            MESSAGE FORMAT

            {
                type: pub|sub,
                route: name-to-be-given-for-the-queue,
                message: 'message for the intended service' # this field should be included only if the type if pub
            }
        """

        # determine the qeueue the client want to join
        data = client_socket.recv(1024).decode('utf-8')
        data = json.load(data)
        print(f"Data received: {data}")

        if "type" not in data or "route" not in data:
            client_socket.send(json.dumps({"message": "Wrong format"}))
            client_socket.close()

        self.client_connections[client_socket] = client_address

        if data["route"] not in self.message_queues:
            self.message_queues[data["route"]] = [client_socket]
        else:
            self.message_queues[data["route"]].append(client_socket)

        print(
            f"Client connected to the queue: {client_socket.getpeername()} => {data['route']}"
        )

    def handle_client_connection(self, client_socket, client_address):
        self.on_connection(client_socket, client_address)
        while True:
            message = client_socket.recv(1024).decode()

            if not message:
                break
            self.publish_message(message)

    """
        EACH AND EVERY MESSAGE +> FOR PUBLISIHING AND SUBSCRIBING CASES
        MUST FOLLOW A SINGLE FORMAT
        {
            key: "Indicates the message-queue",
            message: "The actual message for the receiver"
        }
    """

    def publish_message(self, message):
        # here check the message route key then add it to the respective queue
        self.message_queues.append(message)
        # if the queue is not there yet meaning the subscriber is not subscribed yet then create a queue and put it there
        # the incomiung message will be JSON in that the route key will be there, indicating the queue

        for client_socket in self.client_sockets:
            client_socket.send(message.encode())

    def subscribe_to_messages(self, callback):
        # if a queue is not there then create the queue for the subscriber
        self.message_queue_callbacks.append(callback)
        # add the and wait for new messages
        # the incomiung message will be JSON in that the route key will be there, indicating the queue
        # a call back is not needed for this

        for message in self.message_queue:
            callback(message)

    def stop(self):
        self.server_socket.close()

        for client_socket, client_address in self.client_connections.items():
            client_socket.close()


if __name__ == '__main__':
    server = MessageQueueServer(5000)
    server.start()

    def on_message(message):
        print('Received message:', message)

    server.subscribe_to_messages(on_message)

    while True:
        input()
