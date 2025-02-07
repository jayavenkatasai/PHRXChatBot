// socketHelpers/socketEmitter.js

const io = require('socket.io-client');

// Replace with your actual socket server URL
const SOCKET_SERVER_URL = 'https://stage-phrx-customerchat-nodesocketserver.azurewebsites.net'; // Example URL

// Initialize the socket connection
const socket = io(SOCKET_SERVER_URL);

// Function to emit agent request
async function emitAgentRequest(details) {
    return new Promise((resolve, reject) => {
        socket.emit('request_from_chatbot', details, (ack) => {
            if (ack.status === 'ok') {
                resolve();
            } else {
                reject(new Error('Failed to emit agent request.'));
            }
        });
    });
}

module.exports = { emitAgentRequest };
