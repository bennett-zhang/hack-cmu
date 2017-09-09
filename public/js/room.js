$(() => {
	const socket = io();
	const $users = $("#users");
	const $story = $("#story");
	const $form = $("#form");
	const $snippetInput = $("#snippet-input");
	const $snippetButton = $("#snippet-button");
	let selfUser;
	const $errors = $("#errors");

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
				timeBadge = `<span class="badge badge-pill badge-warning"> ${30} seconds left </span>`;
			}

			$users.append(`
				<li class="list-group-item" style="color: ${user.color}">
					<span class="badge badge-pill badge-dark"> ${i + 1} </span>
					${user.name}
					${meBadge}
					${timeBadge}
				</li>`);
		}

		if (room.usersNeeded > 0) {
			$users.append(`<li class="list-group-item">${room.usersNeeded} users needed</li>`);
		}
	}

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
		updateUsers(room);
	});

	socket.on("leave", room => {
		updateUsers(room);
	});

	$form.submit(() => {
		socket.emit("snippet", $snippetInput.val().trim(), msg => {
			console.log("ready to display message");
			if (msg) {
				$errors.show();
				$errors.text(msg);
			} else {
				$errors.hide();
			}
		});
		$snippetInput.val("");
		return false;
	});

	socket.on("snippet", (snippet, color) => {
		$story.append(`<span style="color: ${color}"> ${snippet}</span>`);
	});
});
