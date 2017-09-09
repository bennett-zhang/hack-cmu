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
const MAX_ROOM_SIZE = 3; //MAX ROOM SIZE IS 3 ONLY FOR TESTING PURPOSES
const MAX_WORD_COUNT = 300;
const MIN_ARCHIVABLE_WORD_COUNT = 200;
const MAX_WORDS_PER_TURN = 3;
const MAX_CHARS_PER_TURN = 20; // When changing this, make sure to update the maxlength attribute for the text box

const users = [];
/* user
{
	name,
	socket.id,
	roomID // ID of the room that the user belongs to, null if none,
	players_turn // Is it this player's turn?
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
	"Crimson",
	"Peru",
	"DarkKhaki",
	"LimeGreen",
	"SeaGreen",
	"DarkTurquoise",
	"RoyalBlue",
	"Indigo"
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
		roomID: null,
		players_turn: false
	});
	res.redirect("/room");
});

app.get("/room", (req, res) => {
	if (filledForm) {
		res.sendFile(__dirname + "/public/room.html");
		filledForm = false;
	} else {
		res.redirect("/");
	}
});

io.on("connection", socket => {
	console.log("connected");
	console.log(socket.id);

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
	user.roomID = room.ID; // Make sure the user knows what room he/she is in
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

	// Tell everyone in the room that someone has joined
	io.to(room.ID).emit("join", room);

	// The game has started once the room is full
	if (room.users.length === MAX_ROOM_SIZE) {
		room.started = true;
		io.to(room.users[0].socketID).emit("start_turn");
		users[0].players_turn = true;
	}

	socket.on("disconnect", () => {
		// If so many people leave that the room gets below its minimum size, evacuate the room
		if (room.users.length - 1 < MIN_ROOM_SIZE) {
			for (let i = 0; i < room.users.length; i++) {
				room.users[i].roomID = null;
			}
			room.users.length = 0;
			room.started = false;
		} else {
			// Remove the user that disconnected from the room
			for (let i = 0; i < room.users.length; i++) {
				if (user === room.users[i]) {
					user.roomID = null;
					room.users.splice(i, 1);
					break;
				}
			}
		}

		// Tell everyone in the room that someone has left
		io.to(room.ID).emit("leave", room);
	});

	socket.on("snippet", snippet => {
		// Only send snippets if the game has begun
		if (room.started) {
			console.log("snippet: " + snippet);
      if (validSnippet) {
			  io.to(room.ID).emit("snippet", snippet, user.color); //I changed this from "io.emit" --> "io.to(room.ID).emit"
        // End that player's turn and start the next player's turn.
        for(var i = 0; i < users.length; i++) {
          if (users[i].players_turn === true) {
            io.to(room.users[i].socketID).emit("end_turn");
            users[i].players_turn = false;
            if (i != users.length - 1) {
              io.to(room.users[i+1].socketID).emit("start_turn");
              users[i+1].players_turn = true;
            } else {
              io.to(room.users[0].socketID).emit("start_turn");
              users[0].players_turn = true;
            }
            i = users.length;
          }
        }
        return "";
      } else {
        return 'You may submit a maximum of '+MAX_WORDS_PER_TURN+'words and '+MAX_CHARS_PER_TURN+' characters in a turn';
      }
		}
	});
});

http.listen(port, () => {
	console.log(`Listening on ${port}.`);
});
