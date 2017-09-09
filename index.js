"use strict";

const express = require("express");
const app = express();
const http = require("http").Server(app);
const port = process.env.PORT || 3000;
const io = require("socket.io")(http);
const bodyParser = require("body-parser");

const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 20; // When changing this, make sure to update the maxlength attribute for the text box
const MIN_ROOM_SIZE = 3;
const MAX_ROOM_SIZE = 5; // MAX ROOM SIZE IS 5 ONLY FOR TESTING PURPOSES
const MAX_WORD_COUNT = 300;
const MIN_ARCHIVABLE_WORD_COUNT = 200;
const MAX_WORDS_PER_TURN = 3;
const MAX_CHARS_PER_TURN = 20; // When changing this, make sure to update the maxlength attribute for the text box

const users = [];
/* user
{
	name,
	socketID,
	usersTurn // Is it this user's turn?
}
*/

const rooms = [];
/* room
{
	ID,
	users, // Array of the users inside the room
	usersNeeded, // How many users need to join before the game can start
	started // True when enough users have joined and the game has started
}
*/

// Prevents the user from accessing a room without first filling out the form
let filledForm = false;

// Add more colors as you see fit
const colors = [
	"rgb(7, 107, 255)",
	"rgb(133, 142, 151)",
	"rgb(0, 176, 72)",
	"rgb(241, 0, 49)",
	"rgb(255, 195, 0)",
	"rgb(0, 165, 187)",
	"rgb(51, 58, 64)",
	"rgb(128, 0, 128)"
];

// There must be enough colors so that every user can have a unique one
if (colors.length < MAX_ROOM_SIZE) {
	throw "Not enough colors for everybody.";
}

app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(express.static("public"));

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/public/index.html");
});

app.post("/create-user", (req, res) => {
	filledForm = true;

	const usernameInput = req.body["username-input"];

	// Check that the username entered has an acceptable length
	if (usernameInput.length < MIN_NAME_LENGTH || usernameInput.length > MAX_NAME_LENGTH) {
		res.redirect("/");
	}

	users.push({
		name: usernameInput,
		socketID: null,
		usersTurn: false
	});

	res.redirect("/room");
});

app.get("/room", (req, res) => {
	if (filledForm) {
		res.sendFile(__dirname + "/public/room.html");
	} else {
		res.redirect("/");
	}
});

io.on("connection", socket => {
	console.log("connected");
	console.log(socket.id);

	if (filledForm) {
		filledForm = false;
	} else {
		return;
	}

	const user = users[users.length - 1];
	let room;

	// Try to join an existing room
	for (let i = 0; i < rooms.length; i++) {
		// Only join if room needs more people and the game hasn't already started
		if (rooms[i].users.length < MAX_ROOM_SIZE && !rooms[i].started) {
			room = rooms[i];
			break;
		}
	}

	// If a room with open spots cannot be found, create a new room
	if (!room) {
		room = {
			ID: rooms.length,
			users: [],
			started: false
		};
		rooms.push(room);
	}

	socket.join(room.ID); // Connect the socket to the room
	user.socketID = socket.id; // Save the socket.id so we can refer to each user individually
	room.users.push(user); // Add the user to the room
	room.usersNeeded = MAX_ROOM_SIZE - room.users.length; // Calculate how many more users need to join the game

	// Keep getting random colors within the palette until a unique one is found
	let userColor;
	do {
		userColor = colors[Math.floor(Math.random() * colors.length)];
	} while (room.users.find(({
			color
		}) => {
			return userColor === color;
		}));
	user.color = userColor;

	io.to(user.socketID).emit("selfJoin", user);

	// Tell everyone in the room that someone has joined
	io.to(room.ID).emit("join", room);

	// The game has started once the room is full
	if (room.users.length === MAX_ROOM_SIZE) {
		room.started = true;

		const nextUser = room.users[0];
		nextUser.usersTurn = true;
		io.to(room.ID).emit("changeTurns", room);
		io.to(nextUser.socketID).emit("startTurn");
	}

	function nextTurn() {
		// End the current user's turn
		io.to(user.socketID).emit("endTurn");
		user.usersTurn = false;

		// Start the next user's turn
		const nextIndex = (room.users.indexOf(user) + 1) % room.users.length;
		const nextUser = room.users[nextIndex];
		nextUser.usersTurn = true;
		io.to(room.ID).emit("changeTurns", room);
		io.to(nextUser.socketID).emit("startTurn");
	}

	socket.on("snippet", (snippet, validate) => {
		console.log(room.started && user.usersTurn);
		// Only send snippets if the game has begun and it's the user's turn
		if (room.started && user.usersTurn) {
			console.log("snippet: " + snippet);
			const validSnippet = snippet.split(" ").length <= MAX_WORDS_PER_TURN && snippet.length <= MAX_CHARS_PER_TURN;
			if (validSnippet) {
				io.to(room.ID).emit("snippet", snippet, user.color);
				nextTurn();
				validate("");
			} else {
				validate("You may submit a maximum of " + MAX_WORDS_PER_TURN + " words and " + MAX_CHARS_PER_TURN + " characters in a turn");
			}
		}
	});

	socket.on("disconnect", () => {
		// If so many people leave that the room gets below its minimum size, evacuate the room
		if (room.users.length <= MIN_ROOM_SIZE) {
			room.users.length = 0;
			room.started = false;
		} else {
			// Remove the user that disconnected from the room
			for (let i = 0; i < room.users.length; i++) {
				if (user === room.users[i]) {
					if (user.usersTurn) {
						nextTurn();
					}

					room.users.splice(i, 1);
					break;
				}
			}
		}

		// Tell everyone in the room that someone has left
		io.to(room.ID).emit("leave", room);
	});
});

http.listen(port, () => {
	console.log(`Listening on ${port}.`);
});
