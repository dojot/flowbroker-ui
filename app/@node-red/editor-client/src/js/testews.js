#!/usr/bin/env node
const WebSocketClient = require("websocket").client;

const client = new WebSocketClient();

client.on("connectFailed", (error) => {
  console.log(`Connect Error: ${error.toString()}`);
});

client.on("connect", (connection) => {
  console.log("WebSocket Client Connected");
  connection.on("error", (error) => {
    console.log(`Connection Error: ${error.toString()}`);
  });
  connection.on("close", () => {
    console.log("echo-protocol Connection Closed");
  });
  connection.on("message", (message) => {
    if (message.type === "utf8") {
      console.log(`Received: '${message.utf8Data}'`);
    }
  });

  function sendNumber() {
    if (connection.connected) {
      const number = Math.round(Math.random() * 0xffffff);
      connection.sendUTF(number.toString());
      setTimeout(sendNumber, 1000);
    }
  }
  sendNumber();
});

client.connect("ws://localhost:7000/francisco/nodered/comms", "echo-protocol");
