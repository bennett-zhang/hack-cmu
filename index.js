"use strict";

const express = require("express");
const app = express();
const http = require("http").Server(app);
const port = process.env.PORT || 3000;
const io = require("socket.io")(http);

app.use(express.static("public"));

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/public/index.html");
});

io.on("connection", socket => {
	socket.emit("connection", socket.player);

	socket.on("evt", () => {

	});
});

http.listen(port, () => {
	console.log(`Listening on ${port}.`);
});
