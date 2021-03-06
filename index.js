"use strict";

const express = require("express");
const app = express();
const http = require("http").Server(app);
const port = process.env.PORT || 3000;
const io = require("socket.io")(http);
const mongoose = require("mongoose"); // interact with MongoDB
const morgan = require("morgan"); // log requests to the console (express4)
const bodyParser = require("body-parser"); // pull information from HTML POST (express4)
const methodOverride = require("method-override"); // simulate DELETE and PUT (express4)


app.use(express.static("public"));
app.use(morgan("dev")); // log every request to the console
app.use(bodyParser.urlencoded({
	"extended": "true"
})); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json
app.use(bodyParser.json({
	type: "application/vnd.api+json"
})); // parse application/vnd.api+json as json
app.use(methodOverride());


const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 20; // When changing this, make sure to update the maxlength attribute for the text box
const MIN_ROOM_SIZE = 3;
const MAX_ROOM_SIZE = 4;
const MAX_WORD_COUNT = 300;
const MIN_ARCHIVABLE_WORD_COUNT = 200;
const MAX_WORDS_PER_TURN = 3;
const MAX_CHARS_PER_TURN = 20; // When changing this, make sure to update the maxlength attribute for the text box
const MAX_TIME_PER_TURN = 30; // Make sure this agrees with room.js

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
	started, // True when enough users have joined and the game has started
	storyText, // The plaintext version of the story
	time
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
			started: false,
			storyText: "",
			time: 0
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

		// Timer
		setInterval(() => {
			if (room.time < MAX_TIME_PER_TURN - 1) {
				room.time++;
				io.to(room.ID).emit("updateTime", MAX_TIME_PER_TURN - room.time);
			} else {
				room.time = 0;
				nextTurn();
			}
		}, 1000);
	}

	function nextTurn() {
		for (let i = 0; i < room.users.length; i++) {
			if (room.users[i].usersTurn) {
				// End the current user's turn
				io.to(room.users[i].socketID).emit("endTurn");
				room.users[i].usersTurn = false;

				// Start the next user's turn
				const nextIndex = (i + 1) % room.users.length;
				const nextUser = room.users[nextIndex];
				nextUser.usersTurn = true;
				io.to(room.ID).emit("changeTurns", room);
				io.to(nextUser.socketID).emit("startTurn");
				break;
			}
		}
	}

	socket.on("snippet", (snippet, validate) => {
		console.log(room.started && user.usersTurn);
		// Only send snippets if the game has begun and it's the user's turn
		if (room.started && user.usersTurn) {
			console.log("snippet: " + snippet);
			const numWords = snippet.split(" ").length;
			const isEmpty = snippet.replace(" ", "").length == 0;
			const validSnippet = !isEmpty && numWords <= MAX_WORDS_PER_TURN && snippet.length <= MAX_CHARS_PER_TURN;
			if (validSnippet) {
				room.storyText += " " + snippet;
				const storyLength = room.storyText.split(" ").length;
				const isOver = storyLength >= MAX_WORD_COUNT;
				const wordsLeft = isOver ? 0 : Math.max(MAX_WORDS_PER_TURN, MAX_WORD_COUNT - storyLength);
				io.to(room.ID).emit("snippet", snippet, user.color, wordsLeft);
				if (isOver) {
					var redirect = 'archive.html';
					Story.create({
						title: room.storyText.split(' ').slice(0,5).join(" "),
						text: room.storyText,
						datetime: new Date().toLocaleString(),
						wordcount: storyLength,
						upvotes: 0,
						downvotes: 0,
						netvotes: 0
					}, (error, story) => { 
							var id = story._id.toString();
							redirect += '#!/stories/'+id;
							io.to(room.ID).emit("end game", redirect);
					});     
          io.to(room.ID).emit("end game", redirect);
				}
				room.time = 0;
				nextTurn();
			} else {
				validate(`You must submit between 1 and ${MAX_WORDS_PER_TURN} words and a maximum of ${MAX_CHARS_PER_TURN} characters in a turn.`);
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





/*
Connecting to the database
*/
const promise = mongoose.connect("mongodb://abdn:morewood35@ds145828.mlab.com:45828/pineapple-express-archive", {
	useMongoClient: true,
});

promise.then(function(db) {
	connection.openUri("mongodb://abdn:morewood35@ds145828.mlab.com:45828/pineapple-express-archive");
});


// define schema ============================
const Schema = mongoose.Schema;

const storySchema = new Schema({
	title: String,
	text: String,
	datetime: Date,
	wordcount: Number,
	upvotes: Number,
	downvotes: Number,
	netvotes: Number
});

const Story = mongoose.model("Story", storySchema);



// routes ======================================================================


// get all stories
app.get("/api/stories", (req, res) => {

	// use mongoose to get all stories in the database
	Story.find((err, stories) => {

		// if error in retrieving, send that error
		if (err) {
			res.send(err);
		}

		res.json(stories); // return all stories in JSON format
	});
});

// get one story
app.get("/api/stories/:story_id", (req, res) => {

	// use mongoose to get one story in the database
	Story.findOne({
		_id: req.params.story_id
	}, (err, story) => {

		// if error in retrieving, send that error
		if (err) {
			res.send(err);
		}

		res.json(story); // return one story in JSON format
	});
});


// create a story and send all stories after creation
app.post("/api/stories", (req, res) => {

	Story.create({
		title: req.body.title,
		text: req.body.text,
		datetime: req.body.datetime,
		wordcount: req.body.wordcount,
		upvotes: req.body.upvotes,
		downvotes: req.body.downvotes,
		netvotes: req.body.netvotes

	}, (err, story) => {
		if (err) {
			res.send(err);
		} else {
			res.status(200).send(story._id);
		}
	});
});

// delete a story
app.delete("/api/stories/:story_id", (req, res) => {
	Story.remove({
		_id: req.params.story_id
	}, (err, story) => {
		if (err) {
			res.send(err);
		}

		// get and return all stories after deleting one
		Story.find((err, stories) => {
			if (err) {
				res.send(err)
			}
			res.json(stories);
		});
	});
});



app.get("/", (req, res) => {
	res.sendFile(__dirname + "/public/index.html");
});


http.listen(port, () => {
	console.log(`Listening on ${port}.`);
});
