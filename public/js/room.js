$(() => {
	const socket = io();
	const $users = $("#users");
	const $story = $("#story");
	const $form = $("#form");
	const $snippetInput = $("#snippet-input");
	const $snippetButton = $("#snippet-button");
	let $timeLeft = $("#time-left");
	let selfUser;
	const $errors = $("#errors");
<<<<<<< HEAD
	const MAX_TIME_PER_TURN = 10; // Make sure this agrees with index.js
=======
  const $words = $("#words");
  $words.hide();
	$errors.hide();
>>>>>>> 7baacf8660063c35f78c9ac38c23c3095aed92d1

	function updateUsers(room) {
		$users.empty();

		for (let i = 0; i < room.users.length; i++) {
			const user = room.users[i];
			let meBadge = "";
			let timeBadge = "";

			if (selfUser.socketID === user.socketID) {
				meBadge = `<span class="badge badge-pill badge-primary"> Me </span>`;
			}

			if (user.usersTurn) {
				timeBadge = `<span id="time-left" class="badge badge-pill badge-warning"> ${MAX_TIME_PER_TURN} seconds left </span>`;
			}

			$users.append(`
				<li class="list-group-item" style="color: ${user.color}">
					<span class="badge badge-pill badge-dark"> ${i + 1} </span>
					${user.name}
					${meBadge}
					${timeBadge}
				</li>`);

			$timeLeft = $("#time-left");
		}

		if (room.usersNeeded > 0) {
			$users.append(`<li class="list-group-item">${room.usersNeeded} users needed</li>`);
		}
	}

	// Update timer badge
	socket.on("updateTime", timeLeft => {
		$timeLeft.text(` ${timeLeft} seconds left `);
	});

	// A player will receive "start_turn" when it reaches their turn
	socket.on("startTurn", () => {
		// Add big textbox or pop-up saying "IT'S YOUR TURN!"
		// Include visual timer display to count down time left
		console.log("Your turn!")

		$snippetInput.removeAttr("disabled");
		$snippetButton.removeAttr("disabled");
	});

	// A player will receive "end_turn" once they've entered a snippet or time runs out
	socket.on("endTurn", () => {
		console.log("Your turn is over.")

		$snippetInput.attr("disabled", true);
		$snippetButton.attr("disabled", true);
	});

	socket.on("selfJoin", user => {
		selfUser = user;
	});

	socket.on("join", room => {
		updateUsers(room);
	});

	socket.on("changeTurns", room => {
		console.log(room.users);
		updateUsers(room);
	});

	socket.on("leave", room => {
		updateUsers(room);
	});

	$form.submit(() => {
		socket.emit("snippet", $snippetInput.val().trim(), msg => {
			console.log("ready to display message");
			$errors.show();
			$errors.text(msg);
		});
		$snippetInput.val("");
		return false;
	});

	socket.on("snippet", (snippet, color, wordsLeft) => {
    $errors.hide();
    $words.text(wordsLeft+' words left in the story');
    $words.show();
		$story.append(`<span style="color: ${color}"> ${snippet}</span>`);
  });

  socket.on("end game", archiveUrl => {
    //archive
  });
});
