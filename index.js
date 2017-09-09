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

io.on('connection', function(socket){
	console.log("connected");
	socket.on("snippet", function(snip) {
		console.log('got it');
		io.emit("snippet", snip);	
	});
});

http.listen(port, () => {
	console.log(`Listening on ${port}.`);
});

const max_room_size = 10;
const min_room_size = 3;
const max_word_count = 300;
const min_archivable_word_count = 200;
const max_words_per_turn = 3;
const max_chars_per_turn = 5;
